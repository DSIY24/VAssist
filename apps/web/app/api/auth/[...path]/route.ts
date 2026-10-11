import { getAuth } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ path: string[] }> };
type Handlers = ReturnType<ReturnType<typeof getAuth>["handler"]>;

// Workspaces and members are our own tables; Neon's Organization and Admin
// plugins are enabled on the branch but unused, so their endpoints stop here.
const refused = new Set(["organization", "admin"]);

let handlers: Handlers | undefined;

function route(method: "GET" | "POST") {
    return async (request: Request, context: RouteContext) => {
        const { path } = await context.params;
        if (refused.has(path[0]?.toLowerCase() ?? "")) {
            return Response.json({ message: "Not found" }, { status: 404 });
        }
        handlers ??= getAuth().handler();
        // `params` is passed on as the promise the handler expects.
        return handlers[method](request, context);
    };
}

// The one endpoint that is not an oRPC procedure: Neon Auth's browser client
// talks to it, and it proxies to the managed auth service and sets the session
// cookies.
export const GET = route("GET");
export const POST = route("POST");
