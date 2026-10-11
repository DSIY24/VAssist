import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { logUnexpectedError } from "@/server/log-error";
import { router } from "@/server/router";

// Agent replies stream through this route later (TECH-STACK section 8).
export const maxDuration = 300;

const handler = new RPCHandler(router, {
    interceptors: [onError(logUnexpectedError)],
});

async function handleRequest(request: Request) {
    const { response } = await handler.handle(request, { prefix: "/rpc" });
    return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
