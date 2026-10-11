import "server-only";
import { implement } from "@orpc/server";
import { getMembershipByUserId } from "@vassist/db";
import { contract } from "@vassist/shared";
import { getSession } from "@/lib/auth/session";

/**
 * The plain implementer. Use it only to assemble the router: every procedure is
 * built from one of the bases below, so that none is reachable without a
 * session.
 */
export const os = implement(contract);

/**
 * Base for procedures that need a signed-in person with a verified email, with
 * or without a workspace. Adds `user` to the context.
 *
 * Used by the two procedures that run before a workspace exists
 * (`workspace.get`, `workspace.create`). Everything else uses `ownerProcedure`.
 */
export const sessionProcedure = os.use(async ({ next, errors }) => {
    const session = await getSession();
    // The dashboard is not usable until the email is verified (PRD A-1).
    if (!session || !session.user.emailVerified) throw errors.UNAUTHORIZED();
    return next({ context: { user: session.user } });
});

/**
 * Base for every dashboard procedure that reads or writes workspace data. Adds
 * `user` and `workspaceId` to the context.
 *
 * `workspaceId` is derived here from the session and nowhere else: handlers
 * pass `context.workspaceId` to the data-access functions in `@vassist/db` and
 * never take a workspace id from their input.
 *
 * oRPC v2 does not dedupe middleware, so build a procedure from exactly one
 * base: `ownerProcedure.<path>.handler(...)`.
 */
export const ownerProcedure = sessionProcedure.use(
    async ({ context, next, errors }) => {
        const membership = await getMembershipByUserId(context.user.id);
        if (!membership) throw errors.FORBIDDEN();
        return next({ context: { workspaceId: membership.workspaceId } });
    },
);
