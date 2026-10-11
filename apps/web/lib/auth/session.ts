import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAuth } from "./server";

export type SessionUser = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
};

export type Session = {
    user: SessionUser;
    session: { id: string };
};

/** True for an upstream failure worth a log line: a 5xx or a transport error. */
function isUnexpected(error: unknown) {
    if (typeof error !== "object" || error === null) return true;
    const { status, code } = error as { status?: unknown; code?: unknown };
    return (
        (typeof status === "number" && status >= 500) ||
        (typeof code === "string" && code.startsWith("NETWORK_"))
    );
}

/** Logs why a session read failed. Never the cookies or tokens involved. */
function logFailure(error: unknown) {
    const { status, code, message } = (
        typeof error === "object" && error !== null ? error : {}
    ) as { status?: unknown; code?: unknown; message?: unknown };
    console.error("Session read failed; treating the request as signed out.", {
        status: typeof status === "number" ? status : undefined,
        code: typeof code === "string" ? code : undefined,
        message: typeof message === "string" ? message : undefined,
    });
}

/**
 * The current Neon Auth session, or `null`. Never throws, apart from Next's
 * own control-flow errors, which pass through.
 *
 * Reads `cookies()` and `headers()`, so a Server Component that calls it has to
 * sit inside `<Suspense>`. React's `cache()` dedupes within one Server
 * Component render, so guards, layouts and procedures called during that render
 * share a single read. It does not dedupe in route handlers (`/rpc`,
 * `/api/v1`): each call there reads again.
 *
 * An unverified email still yields a session here. Callers that gate access
 * (`lib/auth/guards.ts`, `sessionProcedure`) check `user.emailVerified`.
 */
export const getSession = cache(async (): Promise<Session | null> => {
    // Wait for a real request. During prerendering this never resolves, so the
    // static shell stops here instead of Neon Auth reading `cookies()`, failing
    // and logging an error for every gated route at build time.
    await connection();
    try {
        const { data, error } = await getAuth().getSession();
        if (error) {
            // A 4xx is an ordinary "no session". Anything else is a failure
            // that would otherwise look like one.
            if (isUnexpected(error)) logFailure(error);
            return null;
        }
        if (!data?.user || !data.session) return null;
        const { user, session } = data;
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ?? null,
                emailVerified: user.emailVerified === true,
            },
            session: { id: session.id },
        };
    } catch (error) {
        // `redirect()`, `notFound()` and the request-time API signals are
        // Next's to handle.
        unstable_rethrow(error);
        // A safety net. `proxy.ts` refreshes the session cookie on the
        // response; the render of that same request does not see it and
        // re-reads upstream. Neon's `get-session` sets no cookie (verified
        // live), so that read succeeds in a Server Component, where writing a
        // cookie would throw. If that ever changes, or the auth variables are
        // missing, it lands here: log it and treat the request as signed out.
        logFailure(error);
        return null;
    }
});
