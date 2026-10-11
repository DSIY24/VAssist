import "server-only";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

function requireEnv(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET") {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `${name} is not set. Add it to the repo-root .env.local (see .env.example).`,
        );
    }
    return value;
}

let instance: NeonAuth | undefined;

/**
 * The Neon Auth server instance: session reads, the `/api/auth` proxy handler
 * and the route-protection middleware used by `proxy.ts`.
 *
 * Created on first use, not at import, so `next build` can load the modules
 * that call it in an environment without the auth variables. A missing
 * variable throws here, on the first request that needs auth.
 *
 * Session data is cached in a signed cookie for `sessionDataTtl` seconds (300
 * by default, accepted for v1), so a session revoked elsewhere stays valid here
 * for up to five minutes.
 */
export function getAuth(): NeonAuth {
    instance ??= createNeonAuth({
        baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
        cookies: {
            // Must be at least 32 characters, or construction throws.
            secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
        },
    });
    return instance;
}
