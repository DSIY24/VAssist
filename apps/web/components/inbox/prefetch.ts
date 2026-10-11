import "server-only";
import { dehydrate, type QueryClient } from "@tanstack/react-query";
import { serverClient } from "@/lib/orpc/server";
import { getServerQueryClient } from "@/lib/query/server";
import {
    conversationCountsOptions,
    conversationListOptions,
    conversationMessagesOptions,
    conversationOptions,
} from "./queries";

// The option builders give the query keys the browser will read. Their own
// fetchers go through the browser client, so each prefetch brings a fetcher
// that calls the procedure in this process instead.

/** The first page of the default list and the counts. */
export async function prefetchInbox() {
    const queryClient = getServerQueryClient();
    await Promise.all([
        queryClient.prefetchInfiniteQuery({
            queryKey: conversationListOptions("open").queryKey,
            queryFn: ({ pageParam }) =>
                serverClient.conversations.list({
                    filter: "open",
                    cursor: pageParam,
                }),
            initialPageParam: undefined as string | undefined,
        }),
        queryClient.prefetchQuery({
            queryKey: conversationCountsOptions().queryKey,
            queryFn: () => serverClient.conversations.counts(),
        }),
    ]);
    return queryClient;
}

/**
 * One conversation and its history. A conversation that does not exist is
 * left for the browser to report: a failed prefetch stores nothing.
 */
export async function prefetchConversation(id: string) {
    const queryClient = getServerQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: conversationOptions(id).queryKey,
            queryFn: () => serverClient.conversations.get({ id }),
        }),
        queryClient.prefetchQuery({
            queryKey: conversationMessagesOptions(id).queryKey,
            queryFn: () => serverClient.conversations.messages({ id }),
        }),
    ]);
    return queryClient;
}

/**
 * Dehydrates what has finished loading, and nothing else.
 *
 * The layout and the page share one query client per request and prefetch at
 * the same time. The client's default also hands over queries that are still
 * pending, so the layout would pass on the page's half-done queries: the
 * browser then waits on them with none of the page's own options, and a
 * conversation that does not exist retries for seconds before saying so.
 */
export function dehydrateSettled(queryClient: QueryClient) {
    return dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => query.state.status === "success",
    });
}
