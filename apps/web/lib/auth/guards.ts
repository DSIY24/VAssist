import "server-only";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/orpc/server";
import { getSession, type SessionUser } from "./session";

// Each guard reads the session, so call them only inside a `<Suspense>`
// boundary. `redirect()` works by throwing: never wrap a guard, or the calls in
// here, in a try/catch.
//
// `proxy.ts` already turns away requests without a session cookie. The guards
// are the real check: they validate the session, require a verified email and
// look up the workspace.

/** The signed-in person with a verified email, or `null`. */
async function getVerifiedUser(): Promise<SessionUser | null> {
    const session = await getSession();
    return session?.user.emailVerified ? session.user : null;
}

/** No session → `/login`. */
export async function requireSession(): Promise<SessionUser> {
    const user = await getVerifiedUser();
    if (!user) redirect("/login");
    return user;
}

/** For the dashboard. No session → `/login`; no workspace → `/onboarding`. */
export async function requireOwner(): Promise<{
    user: SessionUser;
    workspace: { id: string; name: string };
}> {
    const user = await requireSession();
    const workspace = await serverClient.workspace.get();
    if (!workspace) redirect("/onboarding");
    return { user, workspace };
}

/** For `/onboarding`. No session → `/login`; has a workspace → `/dashboard`. */
export async function requireNoWorkspace(): Promise<SessionUser> {
    const user = await requireSession();
    const workspace = await serverClient.workspace.get();
    if (workspace) redirect("/dashboard");
    return user;
}

/**
 * For `/login` and `/signup`. A signed-in person goes to `/dashboard`, or to
 * `/onboarding` when they have no workspace yet. Anyone else, including someone
 * whose email is not verified yet, stays on the page.
 */
export async function redirectIfSignedIn(): Promise<void> {
    const user = await getVerifiedUser();
    if (!user) return;
    const workspace = await serverClient.workspace.get();
    redirect(workspace ? "/dashboard" : "/onboarding");
}
