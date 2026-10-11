"use client";

import * as React from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";

type InboxContextValue = {
    /** Whether the visitor details are shown beside the conversation. */
    detailsOpen: boolean;
    setDetailsOpen: (open: boolean) => void;
};

const InboxContext = React.createContext<InboxContextValue | null>(null);

export function useInbox() {
    const value = React.use(InboxContext);
    if (!value) throw new Error("useInbox must be used inside InboxShell.");
    return value;
}

/**
 * The inbox frame: the list pane on the left, the open conversation beside
 * it. It fills the height under the header and each pane scrolls on its own.
 * Below `md` only one of the two shows: the list, or the conversation.
 *
 * It lives in the inbox layout, so the list keeps its filter and its scroll
 * position while the owner moves between conversations.
 */
export function InboxShell({ children }: { children: React.ReactNode }) {
    // The conversation id while one is open, `null` on `/dashboard/inbox`.
    const selectedId = useSelectedLayoutSegment();
    const [detailsOpen, setDetailsOpen] = React.useState(true);
    const context = React.useMemo(
        () => ({ detailsOpen, setDetailsOpen }),
        [detailsOpen],
    );

    return (
        <InboxContext value={context}>
            {/* The inset frame has a 0.5rem margin above and below from `md`. */}
            <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 overflow-hidden md:h-[calc(100svh-var(--header-height)-1rem)] md:rounded-b-xl">
                <aside
                    aria-label="Conversations"
                    className={cn(
                        "min-h-0 w-full shrink-0 flex-col border-r md:flex md:w-80",
                        selectedId ? "hidden" : "flex",
                    )}
                >
                    <ConversationList selectedId={selectedId} />
                </aside>
                <section
                    aria-label="Conversation"
                    className={cn(
                        "min-h-0 min-w-0 flex-1 md:flex",
                        selectedId ? "flex" : "hidden",
                    )}
                >
                    {children}
                </section>
            </div>
        </InboxContext>
    );
}
