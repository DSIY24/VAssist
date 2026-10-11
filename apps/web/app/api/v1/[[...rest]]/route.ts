import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { contract } from "@vassist/shared";
import { logUnexpectedError } from "@/server/log-error";
import { router } from "@/server/router";

export const maxDuration = 300;

const generator = new OpenAPIGenerator({
    converters: [new ZodToJsonSchemaConverter()],
});

const handler = new OpenAPIHandler(router, {
    interceptors: [onError(logUnexpectedError)],
});

// Generated on the first request and reused. Only the JSON is served: there is
// no reference page on the app's origin.
let spec: ReturnType<typeof generator.generate> | undefined;

function getSpec() {
    spec ??= generator.generate(contract, {
        version: "3.1.1",
        base: {
            info: { title: "VAssist API", version: "1.0.0" },
            servers: [{ url: "/api/v1" }],
        },
    });
    // A failed generation is retried on the next request.
    spec.catch(() => {
        spec = undefined;
    });
    return spec;
}

// The REST mirror of `/rpc`, mounted at /api/v1, with its OpenAPI document at
// /api/v1/spec.json.
async function handleRequest(request: Request) {
    const { pathname } = new URL(request.url);
    if (
        pathname === "/api/v1/spec.json" &&
        (request.method === "GET" || request.method === "HEAD")
    ) {
        return Response.json(await getSpec());
    }
    const { response } = await handler.handle(request, { prefix: "/api/v1" });
    return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
