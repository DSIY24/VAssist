import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { Contract } from "@vassist/shared";

// Building the link is safe during the server render of a client component:
// `origin` is only read when a request is made. Server code calls procedures
// through `serverClient` in `lib/orpc/server.ts` instead.
const link = new RPCLink({
    url: "/rpc",
    origin: () => {
        if (typeof window === "undefined") {
            throw new Error(
                "The browser oRPC client was called on the server. Use serverClient from lib/orpc/server.",
            );
        }
        return window.location.origin;
    },
});

/** The browser's typed client for `/rpc`. */
export const client: RouterContractClient<Contract> = createORPCClient(link);

/** TanStack Query options and keys for every procedure. */
export const orpc = createTanstackQueryUtils(client);
