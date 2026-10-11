"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
    ConversationCounts,
    ConversationFilter,
    ConversationSummary,
} from "@vassist/shared";
import { InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    FILTERS,
    plainPreview,
    previewPrefix,
    shortRelativeTime,
    visitorLabel,
} from "./labels";
import { conversationCountsOptions, conversationListOptions } from "./queries";
import { StateBadge } from "./state-badge";
import { useNow } from "./use-now";

function filterCount(
    filter: ConversationFilter,
    counts: ConversationCounts | undefined,
) {
    if (!counts) return null;
    if (filter === "open") return counts.ai + counts.waiting + counts.human;
    return counts[filter];
}

const EMPTY_COPY: Record<ConversationFilter, string> = {
    open: "No open conversations. New ones appear here as visitors write in.",
    waiting: "Nobody is waiting for you.",
    ai: "The agent isn't handling any conversations right now.",
    human: "You haven't taken over any conversations.",
    closed: "No closed conversations yet.",
};

/** The list pane: the state filter and one filter's conversations. */
export function ConversationList({
    selectedId,
}: {
    selectedId: string | null;
}) {
    const [filter, setFilter] = React.useState<ConversationFilter>("open");
    const counts = useQuery(conversationCountsOptions());
    const list = useInfiniteQuery(conversationListOptions(filter));
    const items = list.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                role="group"
                aria-label="Filter conversations by state"
                className="flex shrink-0 flex-wrap gap-1 border-b p-2"
            >
                {FILTERS.map(({ value, label }) => {
                    const count = filterCount(value, counts.data);
                    const active = value === filter;
                    return (
                        <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={active ? "secondary" : "ghost"}
                            aria-pressed={active}
                            className={cn(
                                "gap-1.5",
                                !active && "text-muted-foreground",
                            )}
                            onClick={() => setFilter(value)}
                        >
                            {label}
                            {count !== null ? (
                                <span
                                    className={cn(
                                        "text-xs tabular-nums",
                                        value === "waiting" && count > 0
                                            ? "font-semibold text-attention-foreground"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {count}
                                    <span className="sr-only">
                                        {count === 1
                                            ? " conversation"
                                            : " conversations"}
                                    </span>
                                </span>
                            ) : null}
                        </Button>
                    );
                })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {list.isPending ? (
                    <ConversationListSkeleton />
                ) : list.isError && items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t load conversations.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void list.refetch()}
                        >
                            Try again
                        </Button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-6 pt-10 text-center">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <InboxIcon className="size-5" />
                        </div>
                        <p className="text-sm text-balance text-muted-foreground">
                            {EMPTY_COPY[filter]}
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="flex flex-col gap-0.5 p-2">
                            {items.map((conversation) => (
                                <li key={conversation.id}>
                                    <ConversationRow
                                        conversation={conversation}
                                        selected={
                                            conversation.id === selectedId
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                        {list.hasNextPage ? (
                            <div className="p-2 pt-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground"
                                    disabled={list.isFetchingNextPage}
                                    onClick={() => void list.fetchNextPage()}
                                >
                                    {list.isFetchingNextPage
                                        ? "Loading…"
                                        : "Load more"}
                                </Button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

function ConversationRow({
    conversation,
    selected,
}: {
    conversation: ConversationSummary;
    selected: boolean;
}) {
    const now = useNow();
    const waiting = conversation.state === "waiting";
    const preview = conversation.lastMessage;

    return (
        <Link
            href={`/dashboard/inbox/${conversation.id}`}
            // A long list of rows: fetch a conversation when it is opened.
            prefetch={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
                "relative flex flex-col gap-1 rounded-lg px-3 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                waiting && "bg-attention/10",
                selected
                    ? "bg-accent text-accent-foreground"
                    : waiting
                      ? "hover:bg-attention/15"
                      : "hover:bg-accent/60",
            )}
        >
            {waiting ? (
                <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-attention"
                />
            ) : null}
            <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                    {visitorLabel(conversation.visitor)}
                </span>
                <time
                    dateTime={conversation.lastMessageAt}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                >
                    {now
                        ? shortRelativeTime(conversation.lastMessageAt, now)
                        : null}
                </time>
            </span>
            <span className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-sm text-muted-foreground">
                    {preview ? (
                        <>
                            {previewPrefix(preview.author)}
                            {plainPreview(preview.body)}
                        </>
                    ) : (
                        "No messages yet"
                    )}
                </span>
                <StateBadge
                    state={conversation.state}
                    className="mt-0.5 shrink-0"
                />
            </span>
        </Link>
    );
}

/** Fixed widths: it is also part of the prerendered shell. */
export function ConversationListSkeleton() {
    const widths = ["w-40", "w-32", "w-44", "w-36", "w-40", "w-28"];
    return (
        <div aria-hidden="true" className="flex flex-col gap-0.5 p-2">
            {widths.map((width, index) => (
                <div key={index} className="flex flex-col gap-2 px-3 py-2.5">
                    <Skeleton className={cn("h-4", width)} />
                    <Skeleton className="h-3.5 w-full" />
                </div>
            ))}
        </div>
    );
}
