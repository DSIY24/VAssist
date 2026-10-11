import { RPCJsonSerializer } from "@orpc/client";
import {
    QueryClient,
    defaultShouldDehydrateQuery,
    environmentManager,
    hashKey,
} from "@tanstack/react-query";

// oRPC's serializer keeps the types JSON drops (Date, BigInt, Map, Set and
// more) intact in query keys and across the server-to-browser hydration.
const serializer = new RPCJsonSerializer();

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Above zero, so data prefetched on the server is not refetched
                // as soon as the browser hydrates it.
                staleTime: 60_000,
                queryKeyHashFn: (queryKey) => {
                    const { json, meta } = serializer.serialize(queryKey);
                    return hashKey([
                        json,
                        meta?.map((entry) => JSON.stringify(entry)).sort(),
                    ]);
                },
            },
            dehydrate: {
                shouldDehydrateQuery: (query) =>
                    defaultShouldDehydrateQuery(query) ||
                    query.state.status === "pending",
                // Next.js detects dynamic rendering from the errors it throws,
                // so they must reach it unredacted.
                shouldRedactErrors: () => false,
                serializeData: (data) => {
                    const { json, meta } = serializer.serialize(data);
                    return { json, meta };
                },
            },
            hydrate: {
                deserializeData: (data) => serializer.deserialize(data),
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

/** Server: a new client per call. Browser: one client for the page's lifetime. */
export function getQueryClient() {
    if (environmentManager.isServer()) return makeQueryClient();
    return (browserQueryClient ??= makeQueryClient());
}
