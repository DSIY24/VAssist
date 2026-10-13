import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
    ConversationChange,
    ConversationFilter,
    ConversationSummary,
    Message,
} from "@vassist/shared";
import { orpc } from "@/lib/orpc/client";

/**
 * STOPGAP UNTIL REAL TIME. The inbox has no live delivery yet, so every inbox
 * query refetches on a short interval and when the window regains focus.
 * When the PartyKit rooms land, their events write into these same caches
 * (TECH-STACK section 4) and this object goes away.
 */
export const INBOX_REFRESH = {
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
} as const;

type ListPage = { items: ConversationSummary[]; nextCursor: string | null };

const listInput =
    (filter: ConversationFilter) => (cursor: string | undefined) => ({
        filter,
        cursor,
    });

/** One filter's pages of the conversation list. */
export function conversationListOptions(filter: ConversationFilter) {
    return orpc.conversations.list.infiniteOptions({
        input: listInput(filter),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: ListPage) =>
            lastPage.nextCursor ?? undefined,
        ...INBOX_REFRESH,
    });
}

export function conversationCountsOptions() {
    return orpc.conversations.counts.queryOptions({ ...INBOX_REFRESH });
}

export function conversationOptions(id: string) {
    return orpc.conversations.get.queryOptions({
        input: { id },
        ...INBOX_REFRESH,
        retry: false,
    });
}

export function conversationMessagesOptions(id: string) {
    return orpc.conversations.messages.queryOptions({
        input: { id },
        ...INBOX_REFRESH,
        retry: false,
    });
}

/** Adds messages the cache does not hold yet, keeping the history in order. */
function mergeMessages(existing: Message[], added: Message[]) {
    const known = new Set(existing.map((message) => message.id));
    return [
        ...existing,
        ...added.filter((message) => !known.has(message.id)),
    ].sort(
        (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}

/**
 * Writes the result of a reply or a state change into the cache: the open
 * conversation and its history directly, the list and the counts by refetch
 * (a change of state moves a row between filters and reorders it).
 */
export function applyConversationChange(
    queryClient: QueryClient,
    change: ConversationChange,
) {
    queryClient.setQueryData(
        orpc.conversations.get.queryKey({ input: { id: change.id } }),
        (conversation) =>
            conversation && {
                ...conversation,
                state: change.state,
                lastMessageAt: change.lastMessageAt,
                closedAt: change.closedAt,
            },
    );
    queryClient.setQueryData(
        orpc.conversations.messages.queryKey({ input: { id: change.id } }),
        (messages) => messages && mergeMessages(messages, change.messages),
    );
    // Show the new state in the list at once; the refetch below settles order.
    queryClient.setQueriesData<InfiniteData<ListPage>>(
        { queryKey: orpc.conversations.list.key({ type: "infinite" }) },
        (data) =>
            data && {
                ...data,
                pages: data.pages.map((page) => ({
                    ...page,
                    items: page.items.map((item) =>
                        item.id === change.id
                            ? {
                                  ...item,
                                  state: change.state,
                                  lastMessageAt: change.lastMessageAt,
                              }
                            : item,
                    ),
                })),
            },
    );
    return refreshInbox(queryClient);
}

/** Refetches the list and the counts. */
export function refreshInbox(queryClient: QueryClient) {
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: orpc.conversations.list.key(),
        }),
        queryClient.invalidateQueries({
            queryKey: orpc.conversations.counts.key(),
        }),
    ]);
}

/** Refetches one conversation and its history, after a conflict. */
export function refreshConversation(queryClient: QueryClient, id: string) {
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: orpc.conversations.get.key({ input: { id } }),
        }),
        queryClient.invalidateQueries({
            queryKey: orpc.conversations.messages.key({ input: { id } }),
        }),
        refreshInbox(queryClient),
    ]);
}
