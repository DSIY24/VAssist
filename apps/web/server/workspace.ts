import "server-only";
import { createWorkspaceForOwner, getMembershipByUserId } from "@vassist/db";
import { sessionProcedure } from "./orpc";

// Both procedures run before a workspace exists, so they use the session-only
// base and look the workspace up from the session's user id.

export const getWorkspace = sessionProcedure.workspace.get.handler(
    async ({ context }) => {
        const membership = await getMembershipByUserId(context.user.id);
        return membership?.workspace ?? null;
    },
);

export const createWorkspace = sessionProcedure.workspace.create.handler(
    async ({ context, input }) =>
        createWorkspaceForOwner({ userId: context.user.id, name: input.name }),
);
