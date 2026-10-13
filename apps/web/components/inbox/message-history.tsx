"use client";

import * as React from "react";
import type { Conversation, Message } from "@vassist/shared";
import {
    ArrowRightLeftIcon,
    CircleCheckIcon,
    HandIcon,
    MessageSquareIcon,
    SparklesIcon,
    UserIcon,
    UserRoundCheckIcon,
    type LucideIcon,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/components/dashboard/nav-user";
import { cn } from "@/lib/utils";
import {
    HANDOFF_REASON_LABEL,
    dayKey,
    formatDay,
    formatTime,
    visitorLabel,
} from "./labels";
import { useNow } from "./use-now";

/** A message that is on its way to the server. */
export type PendingMessage = { id: string; body: string };

type Notice = Message & { author: "system" };

function noticeContent(
    message: Message,
    conversation: Conversation,
    isLatestHandoff: boolean,
): { icon: LucideIcon; text: string; detail?: string } {
    switch (message.notice) {
        case "greeting":
            return {
                icon: MessageSquareIcon,
                text: "Greeting shown",
                detail: message.body,
            };
        case "handoff":
            return {
                icon: HandIcon,
                text: "Handed off to you",
                // Only the newest handoff's reason is kept on the
                // conversation.
                detail:
                    isLatestHandoff && conversation.handoffReason
                        ? HANDOFF_REASON_LABEL[conversation.handoffReason]
                        : undefined,
            };
        case "take_over":
            // v1 has one member, so whoever joined is the owner reading this.
            return { icon: UserRoundCheckIcon, text: "You took over" };
        case "hand_back":
            return {
                icon: ArrowRightLeftIcon,
                text: "Handed back to the agent",
            };
        case "closed":
            return { icon: CircleCheckIcon, text: "Conversation closed" };
        default:
            return { icon: MessageSquareIcon, text: message.body };
    }
}

/** A system message: a quiet line between the bubbles. */
function NoticeRow({
    message,
    conversation,
    isLatestHandoff,
}: {
    message: Notice;
    conversation: Conversation;
    isLatestHandoff: boolean;
}) {
    const now = useNow();
    const {
        icon: Icon,
        text,
        detail,
    } = noticeContent(message, conversation, isLatestHandoff);
    return (
        <li className="flex items-start justify-center gap-2 px-2 py-1 text-center text-xs text-muted-foreground">
            <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span className="text-balance">
                <span className="font-medium">{text}</span>
                {detail ? <> · {detail}</> : null}
                {now ? (
                    <>
                        {" · "}
                        <time dateTime={message.createdAt}>
                            {formatTime(message.createdAt)}
                        </time>
                    </>
                ) : null}
            </span>
        </li>
    );
}

function AuthorAvatar({
    author,
    conversation,
}: {
    author: Message["author"];
    conversation: Conversation;
}) {
    if (author === "member") {
        const { owner } = conversation;
        return (
            <Avatar size="sm">
                {owner.image ? (
                    <AvatarImage
                        src={owner.image}
                        alt=""
                        referrerPolicy="no-referrer"
                    />
                ) : null}
                <AvatarFallback className="text-[0.625rem] font-medium text-foreground">
                    {getInitials(owner.name, owner.name)}
                </AvatarFallback>
            </Avatar>
        );
    }
    const Icon = author === "agent" ? SparklesIcon : UserIcon;
    return (
        <Avatar size="sm">
            <AvatarFallback>
                <Icon aria-hidden="true" className="size-3.5" />
            </AvatarFallback>
        </Avatar>
    );
}

function authorName(author: Message["author"], conversation: Conversation) {
    if (author === "agent") return conversation.agentName;
    if (author === "member") return "You";
    return visitorLabel(conversation.visitor);
}

/**
 * One message. The visitor is on the left; the workspace's side (the agent
 * and the owner) is on the right. Authors are told apart by side, name and
 * avatar, never by colour.
 */
function MessageBubble({
    message,
    conversation,
    showAuthor,
    pending = false,
}: {
    message: Pick<Message, "author" | "body" | "declined" | "createdAt">;
    conversation: Conversation;
    /** False for a message that follows one by the same author. */
    showAuthor: boolean;
    pending?: boolean;
}) {
    const now = useNow();
    const { author } = message;
    const ours = author !== "visitor";

    return (
        <li
            className={cn(
                "flex gap-2",
                ours && "flex-row-reverse",
                showAuthor ? "mt-3" : "mt-0.5",
            )}
        >
            <div className="w-6 shrink-0">
                {showAuthor ? (
                    <AuthorAvatar author={author} conversation={conversation} />
                ) : null}
            </div>
            <div
                className={cn(
                    "flex max-w-[min(36rem,85%)] min-w-0 flex-col gap-1",
                    ours ? "items-end" : "items-start",
                )}
            >
                {showAuthor ? (
                    <div className="flex items-baseline gap-2 px-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                            {authorName(author, conversation)}
                        </span>
                        {pending ? (
                            <span>Sending…</span>
                        ) : now ? (
                            <time dateTime={message.createdAt}>
                                {formatTime(message.createdAt)}
                            </time>
                        ) : null}
                    </div>
                ) : null}
                <div
                    className={cn(
                        "max-w-full rounded-2xl px-3 py-2 text-sm",
                        author === "visitor" && "rounded-tl-md bg-muted",
                        author === "agent" &&
                            "rounded-tr-md border bg-background",
                        author === "member" &&
                            "rounded-tr-md bg-primary text-primary-foreground",
                        pending && "opacity-60",
                    )}
                >
                    <Streamdown
                        className={cn(
                            "space-y-2 wrap-anywhere *:first:mt-0 *:last:mb-0",
                            author === "member" &&
                                "[&_a]:text-primary-foreground [&_a]:underline",
                        )}
                    >
                        {message.body}
                    </Streamdown>
                </div>
                {message.declined ? (
                    <Badge
                        variant="outline"
                        className="text-muted-foreground"
                        title="The agent refused this message as off-topic"
                    >
                        Declined
                    </Badge>
                ) : null}
            </div>
        </li>
    );
}

function DaySeparator({ iso, now }: { iso: string; now: number }) {
    return (
        <li
            role="separator"
            className="flex items-center gap-3 py-3 text-xs text-muted-foreground"
        >
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            {formatDay(iso, now)}
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </li>
    );
}

/** The whole history of a conversation, oldest first. */
export function MessageHistory({
    conversation,
    messages,
    pending,
}: {
    conversation: Conversation;
    messages: Message[];
    pending: PendingMessage[];
}) {
    const now = useNow();
    const latestHandoffId = messages.findLast(
        (message) => message.notice === "handoff",
    )?.id;

    const rows: React.ReactNode[] = [];
    let previous: Message | undefined;
    for (const message of messages) {
        // Days are the owner's, so they are only known in the browser.
        if (
            now &&
            (!previous ||
                dayKey(previous.createdAt) !== dayKey(message.createdAt))
        ) {
            rows.push(
                <DaySeparator
                    key={`day-${message.id}`}
                    iso={message.createdAt}
                    now={now}
                />,
            );
            previous = undefined;
        }
        if (message.author === "system") {
            rows.push(
                <NoticeRow
                    key={message.id}
                    message={message as Notice}
                    conversation={conversation}
                    isLatestHandoff={message.id === latestHandoffId}
                />,
            );
        } else {
            rows.push(
                <MessageBubble
                    key={message.id}
                    message={message}
                    conversation={conversation}
                    showAuthor={previous?.author !== message.author}
                />,
            );
        }
        previous = message;
    }
    for (const [index, message] of pending.entries()) {
        rows.push(
            <MessageBubble
                key={message.id}
                pending
                message={{
                    author: "member",
                    body: message.body,
                    declined: false,
                    createdAt: "",
                }}
                conversation={conversation}
                showAuthor={index === 0 && previous?.author !== "member"}
            />,
        );
    }

    return (
        <ol aria-label="Messages" className="flex flex-col px-4 py-4">
            {rows}
        </ol>
    );
}
