import "server-only";
import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { cookies } from "next/headers";
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

/** True when Neon Auth could not be reached at all (DNS, timeout, reset). */
function isTransportError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const { code } = error as { code?: unknown };
    return typeof code === "string" && code.startsWith("NETWORK_");
}

/** True for an upstream failure worth a log line: a 5xx or a transport error. */
function isUnexpected(error: unknown) {
    if (typeof error !== "object" || error === null) return true;
    const { status } = error as { status?: unknown };
    return (
        (typeof status === "number" && status >= 500) || isTransportError(error)
    );
}

/** Logs why a session read failed. Never the cookies or tokens involved. */
function logFailure(error: unknown) {
    const { status, code, message } = (
        typeof error === "object" && error !== null ? error : {}
    ) as { status?: unknown; code?: unknown; message?: unknown };
    // One string: the dev overlay and log file print an object as `{}`.
    const details = [
        typeof status === "number" ? status : undefined,
        typeof code === "string" ? code : undefined,
        typeof message === "string" ? message : undefined,
    ].filter((detail) => detail !== undefined);
    console.error(
        `Session read failed; treating the request as signed out. (${details.join(" ") || "no details"})`,
    );
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
        // No session cookie means signed out. Answering here keeps `/login` and
        // `/signup` from calling Neon Auth for every signed-out visitor.
        const hasSessionCookie = (await cookies())
            .getAll()
            .some(({ name }) => name.includes(NEON_AUTH_SESSION_COOKIE_NAME));
        if (!hasSessionCookie) return null;

        const auth = getAuth();
        let { data, error } = await auth.getSession();
        // A transport failure is often a single dropped connection: try once
        // more before treating a signed-in person as signed out.
        if (isTransportError(error))
            ({ data, error } = await auth.getSession());
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
