import "server-only";
import { createRouterClient } from "@orpc/server";
import { router } from "@/server/router";

/**
 * Calls procedures in this process, with no HTTP. For Server Components and
 * the guards. The session is read by the procedures' own middleware, so the
 * same checks apply as over `/rpc`.
 */
export const serverClient = createRouterClient(router);
