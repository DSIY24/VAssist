import { getDb } from "./client";

/** The roles a member can hold. v1 has one. Stored as text in `members.role`. */
export type MemberRole = "owner";

export type Workspace = { id: string; name: string };

export type Membership = {
    workspaceId: string;
    role: MemberRole;
    workspace: Workspace;
};

/** True when `error`, or one of its causes, is a Postgres unique violation. */
export function isUniqueViolation(error: unknown): boolean {
    let current: unknown = error;
    for (
        let depth = 0;
        depth < 5 && typeof current === "object" && current !== null;
        depth++
    ) {
        const candidate = current as {
            kind?: unknown;
            sqlState?: unknown;
            cause?: unknown;
        };
        if (candidate.kind === "sql_query" && candidate.sqlState === "23505") {
            return true;
        }
        current = candidate.cause;
    }
    return false;
}

/**
 * The membership of a signed-in person, or `null` when they have no workspace
 * yet.
 *
 * This is the single place a `workspaceId` is derived from a user id. Every
 * other function in this package takes `workspaceId` as a required argument,
 * and callers get it from here through the procedure context, never from
 * client input.
 */
export async function getMembershipByUserId(
    userId: string,
): Promise<Membership | null> {
    const member = await getDb()
        .orm.public.Member.where({ userId })
        .select("workspaceId", "role")
        .include("workspace", (workspace) => workspace.select("id", "name"))
        .first();
    // `workspace_id` is NOT NULL with a foreign key, so a member always has a
    // workspace; the relation is only typed as nullable.
    if (!member?.workspace) return null;
    return {
        workspaceId: member.workspaceId,
        role: member.role as MemberRole,
        workspace: { id: member.workspace.id, name: member.workspace.name },
    };
}

/**
 * Creates the owner's workspace and their membership in one transaction.
 *
 * Idempotent: a person has at most one workspace, so a second call (a double
 * submit, a second tab) returns the workspace that already exists and ignores
 * `name`.
 */
export async function createWorkspaceForOwner({
    userId,
    name,
}: {
    userId: string;
    name: string;
}): Promise<Workspace> {
    const db = getDb();
    try {
        return await db.transaction(async (tx) => {
            // Serialise concurrent calls for the same person. The lock is
            // released at commit or rollback, so it is safe on the pooled
            // connection.
            await tx.execute(
                db.raw
                    .sql`select pg_advisory_xact_lock(hashtext(${`vassist:workspace:${userId}`}))`
                    .affectedCount()
                    .build(),
            );
            const existing = await tx.orm.public.Member.where({ userId })
                .select("workspaceId")
                .include("workspace", (workspace) =>
                    workspace.select("id", "name"),
                )
                .first();
            if (existing?.workspace) {
                return {
                    id: existing.workspace.id,
                    name: existing.workspace.name,
                };
            }
            const workspace = await tx.orm.public.Workspace.create({ name });
            await tx.orm.public.Member.create({
                workspaceId: workspace.id,
                userId,
                role: "owner" satisfies MemberRole,
            });
            return { id: workspace.id, name: workspace.name };
        });
    } catch (error) {
        // Backstop: `members.user_id` is unique, so even without the lock a
        // racing call fails here and its whole transaction rolls back, leaving
        // no second workspace behind.
        if (!isUniqueViolation(error)) throw error;
        const membership = await getMembershipByUserId(userId);
        if (!membership) throw error;
        return membership.workspace;
    }
}
