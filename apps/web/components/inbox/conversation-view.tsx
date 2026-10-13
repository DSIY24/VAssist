"use client";

import * as React from "react";
import Link from "next/link";
import { isDefinedError } from "@orpc/client";
import {
    useMutation,
    useQuery,
    useQueryClient,
    type QueryClient,
} from "@tanstack/react-query";
import type {
    Conversation,
    ConversationChange,
    ConversationState,
} from "@vassist/shared";
import {
    ArrowLeftIcon,
    HandIcon,
    MessageSquareOffIcon,
    PanelRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";
import { hardNavigate } from "@/lib/navigation";
import { Composer } from "./composer";
import { useInbox } from "./inbox-shell";
import { HANDOFF_REASON_LABEL, visitorLabel } from "./labels";
import { MessageHistory, type PendingMessage } from "./message-history";
import {
    applyConversationChange,
    conversationMessagesOptions,
    conversationOptions,
    refreshConversation,
    refreshInbox,
} from "./queries";
import { StateBadge } from "./state-badge";
import { VisitorDetails } from "./visitor-details";

const WIDE = "(min-width: 80rem)";

function subscribeWide(onChange: () => void) {
    const query = window.matchMedia(WIDE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

/** True from the `xl` breakpoint, where the details sit beside the history. */
function useIsWide() {
    return React.useSyncExternalStore(
        subscribeWide,
        () => window.matchMedia(WIDE).matches,
        () => false,
    );
}

// What the owner is told when an action finds the conversation somewhere
// else than their screen showed.
const CONFLICT_COPY: Record<ConversationState, string> = {
    closed: "This conversation has been closed.",
    human: "You have already taken over this conversation.",
    ai: "This conversation is back with the agent.",
    waiting: "This conversation is waiting for you again.",
};

/**
 * Reports a failed reply or state change. A conflict means the screen was
 * out of date, so it is refreshed and the owner is told where things stand.
 */
function reportFailure(queryClient: QueryClient, id: string, error: unknown) {
    if (isDefinedError(error)) {
        const { code } = error as { code: string };
        if (code === "CONFLICT") {
            const { state } = (error as { data: { state: ConversationState } })
                .data;
            toast.error(CONFLICT_COPY[state], {
                description: "Nothing was changed.",
            });
            void refreshConversation(queryClient, id);
            return;
        }
        if (code === "NOT_FOUND") {
            toast.error("This conversation no longer exists.");
            void refreshInbox(queryClient);
            return;
        }
        if (code === "UNAUTHORIZED") {
            hardNavigate("/login");
            return;
        }
    }
    toast.error("That didn't work. Try again.");
}

/** The open conversation: its header, history, composer and visitor details. */
export function ConversationView({ id }: { id: string }) {
    const queryClient = useQueryClient();
    const conversation = useQuery(conversationOptions(id));
    const messages = useQuery(conversationMessagesOptions(id));
    const { detailsOpen, setDetailsOpen } = useInbox();
    const isWide = useIsWide();
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [draft, setDraft] = React.useState("");
    const [pending, setPending] = React.useState<PendingMessage[]>([]);

    // Not returned: a mutation waits for a promise from `onSuccess`, and the
    // buttons should come back before the list has refetched.
    const settle = (change: ConversationChange) => {
        void applyConversationChange(queryClient, change);
    };
    const fail = (error: unknown) => reportFailure(queryClient, id, error);
    const dropPending = (pendingId: string | undefined) =>
        setPending((current) =>
            current.filter((message) => message.id !== pendingId),
        );

    // The reply shows at once as a pending bubble, and is swapped for the
    // saved message (and the take-over notice, if there is one) on success.
    const reply = useMutation(
        orpc.conversations.reply.mutationOptions({
            onMutate: ({ body }) => {
                const pendingId = crypto.randomUUID();
                setDraft("");
                setPending((current) => [...current, { id: pendingId, body }]);
                return { pendingId };
            },
            onSuccess: (change, _variables, context) => {
                dropPending(context?.pendingId);
                settle(change);
            },
            onError: (error, variables, context) => {
                dropPending(context?.pendingId);
                // Give the text back, unless a new draft has been started.
                setDraft((current) => current || variables.body);
                fail(error);
            },
        }),
    );
    const takeOver = useMutation(
        orpc.conversations.takeOver.mutationOptions({
            onSuccess: settle,
            onError: fail,
        }),
    );
    const handBack = useMutation(
        orpc.conversations.handBack.mutationOptions({
            onSuccess: settle,
            onError: fail,
        }),
    );
    const close = useMutation(
        orpc.conversations.close.mutationOptions({
            onSuccess: settle,
            onError: fail,
        }),
    );
    const changing =
        takeOver.isPending || handBack.isPending || close.isPending;

    // Keep the newest message in view: always when the conversation opens,
    // afterwards only if the owner has not scrolled up to read.
    const scroller = React.useRef<HTMLDivElement>(null);
    const pinned = React.useRef(true);
    const messageCount = (messages.data?.length ?? 0) + pending.length;
    React.useLayoutEffect(() => {
        const element = scroller.current;
        if (element && pinned.current) element.scrollTop = element.scrollHeight;
    }, [messageCount]);

    if (conversation.isPending || messages.isPending) {
        return <ConversationSkeleton />;
    }
    if (conversation.isError || messages.isError) {
        return (
            <div className="flex flex-1 flex-col">
                <BackLink className="m-2 self-start" />
                <EmptyState
                    icon={MessageSquareOffIcon}
                    title="Conversation not found"
                    description="It may have been removed, or the link is wrong."
                />
            </div>
        );
    }

    const data = conversation.data;
    const { state } = data;
    const label = visitorLabel(data.visitor);

    return (
        <div className="flex min-h-0 min-w-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
                    <BackLink />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h2 className="truncate text-sm font-medium">
                            {label}
                        </h2>
                        <StateBadge state={state} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {state === "ai" || state === "waiting" ? (
                            <Button
                                type="button"
                                size="sm"
                                disabled={changing}
                                onClick={() => takeOver.mutate({ id })}
                            >
                                {takeOver.isPending
                                    ? "Taking over…"
                                    : "Take over"}
                            </Button>
                        ) : null}
                        {state === "human" ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={changing}
                                onClick={() => handBack.mutate({ id })}
                            >
                                {handBack.isPending
                                    ? "Handing back…"
                                    : "Hand to agent"}
                            </Button>
                        ) : null}
                        {state !== "closed" ? (
                            <CloseButton
                                pending={close.isPending}
                                disabled={changing}
                                onConfirm={() => close.mutate({ id })}
                            />
                        ) : null}
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-pressed={isWide ? detailsOpen : undefined}
                            onClick={() =>
                                isWide
                                    ? setDetailsOpen(!detailsOpen)
                                    : setSheetOpen(true)
                            }
                        >
                            <PanelRightIcon />
                            <span className="sr-only">Visitor details</span>
                        </Button>
                    </div>
                </header>

                {state === "waiting" ? (
                    <p className="flex shrink-0 items-start gap-2 border-b bg-attention/10 px-4 py-2 text-sm text-attention-foreground">
                        <HandIcon
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                        />
                        <span>
                            <span className="font-medium">
                                Waiting for you.
                            </span>{" "}
                            {data.handoffReason
                                ? `${HANDOFF_REASON_LABEL[data.handoffReason]}.`
                                : null}
                        </span>
                    </p>
                ) : null}

                <div
                    ref={scroller}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    onScroll={(event) => {
                        const element = event.currentTarget;
                        pinned.current =
                            element.scrollHeight -
                                element.scrollTop -
                                element.clientHeight <
                            80;
                    }}
                >
                    <MessageHistory
                        conversation={data}
                        messages={messages.data}
                        pending={pending}
                    />
                </div>

                {state === "closed" ? (
                    <p className="shrink-0 border-t px-4 py-3 text-center text-sm text-balance text-muted-foreground">
                        This conversation is closed. The visitor&apos;s next
                        message starts a new one.
                    </p>
                ) : (
                    <Composer
                        state={state}
                        draft={draft}
                        onDraftChange={setDraft}
                        onSend={(body) => reply.mutate({ id, body })}
                    />
                )}
            </div>

            {isWide && detailsOpen ? (
                <aside
                    aria-label="Visitor details"
                    className="hidden w-72 shrink-0 overflow-y-auto overscroll-contain border-l xl:block"
                >
                    <VisitorDetails conversation={data} />
                </aside>
            ) : null}
            <DetailsSheet
                conversation={data}
                open={sheetOpen && !isWide}
                onOpenChange={setSheetOpen}
            />
        </div>
    );
}

function BackLink({ className }: { className?: string }) {
    return (
        <Button
            nativeButton={false}
            variant="ghost"
            size="icon-sm"
            className={className ? `md:hidden ${className}` : "md:hidden"}
            render={<Link href="/dashboard/inbox" />}
        >
            <ArrowLeftIcon />
            <span className="sr-only">Back to conversations</span>
        </Button>
    );
}

function CloseButton({
    pending,
    disabled,
    onConfirm,
}: {
    pending: boolean;
    disabled: boolean;
    onConfirm: () => void;
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                    />
                }
            >
                {pending ? "Closing…" : "Close"}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Close this conversation?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        The visitor is told it has ended. If they write again, a
                        new conversation starts.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep open</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Close conversation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DetailsSheet({
    conversation,
    open,
    onOpenChange,
}: {
    conversation: Conversation;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="gap-0 overflow-y-auto">
                <SheetHeader className="border-b">
                    <SheetTitle>Visitor details</SheetTitle>
                    <SheetDescription>
                        {visitorLabel(conversation.visitor)}
                    </SheetDescription>
                </SheetHeader>
                <VisitorDetails conversation={conversation} />
            </SheetContent>
        </Sheet>
    );
}

/** Fixed widths: it is also part of the prerendered shell. */
export function ConversationSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="flex min-h-0 flex-1 flex-col"
        >
            <span className="sr-only">Loading conversation</span>
            <div
                aria-hidden="true"
                className="flex items-center gap-3 border-b px-4 py-3"
            >
                <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="ml-auto h-7 w-24" />
            </div>
            <div aria-hidden="true" className="flex flex-1 flex-col gap-4 p-4">
                <Skeleton className="h-12 w-64 rounded-2xl" />
                <Skeleton className="h-20 w-80 max-w-full self-end rounded-2xl" />
                <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
        </div>
    );
}
