import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

type AuthGuard = ReturnType<ReturnType<typeof getAuth>["middleware"]>;

// Treats every path it is called for as protected: a request without a session
// is redirected to `/login`. It also refreshes the session cookie cache, and
// exchanges the `neon_auth_session_verifier` query param left by Google sign-in
// and magic links for a session, which is why those callbacks land on
// `/dashboard`.
//
// This is a first, optimistic check. The guards in `lib/auth/guards.ts` and the
// oRPC base procedures do the real authorization.
//
// Created on the first request, not at import, so a build without the auth
// variables does not fail here.
let authGuard: AuthGuard | undefined;

export async function proxy(request: NextRequest) {
    // The widget branch goes here: `/widget/:workspaceId` skips `authGuard` and
    // gets `Content-Security-Policy: frame-ancestors` built from the
    // workspace's allowed domains (TECH-STACK section 6).

    authGuard ??= getAuth().middleware({ loginUrl: "/login" });
    // Add headers to this response and return it. Never replace it: it carries
    // the `Set-Cookie` and `Location` headers the session depends on.
    const response = await authGuard(request);
    return response;
}

export const config = {
    // Static values only. Add the widget route here with its branch above.
    matcher: ["/dashboard/:path*", "/onboarding"],
};
