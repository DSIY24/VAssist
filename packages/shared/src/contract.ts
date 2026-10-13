import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { conversationsContract } from "./conversation";
import { knowledgeContract } from "./knowledge";
import { widgetContract } from "./widget";
import { createWorkspaceInputSchema, workspaceSchema } from "./workspace";

// Applied to every procedure by `base.router` below. The HTTP statuses (401 and 403) come
// from the handlers' default error status map, not from the contract.
const base = oc.errors({
    UNAUTHORIZED: { message: "Log in to continue" },
    FORBIDDEN: { message: "You need a workspace to do this" },
});

const getWorkspace = oc
    .meta(
        openapi({
            method: "GET",
            path: "/workspace",
            tags: ["Workspace"],
            summary: "Get the caller's workspace",
            description:
                "Returns null when the caller has not created a workspace yet.",
        }),
    )
    .output(workspaceSchema.nullable());

const createWorkspace = oc
    .meta(
        openapi({
            method: "POST",
            path: "/workspace",
            tags: ["Workspace"],
            summary: "Create the caller's workspace",
            description:
                "Idempotent. A caller has one workspace, so a repeated call returns the existing one unchanged.",
        }),
    )
    .input(createWorkspaceInputSchema)
    .output(workspaceSchema);

export const contract = base.router({
    workspace: {
        get: getWorkspace,
        create: createWorkspace,
    },
    conversations: conversationsContract,
    widget: widgetContract,
    knowledge: knowledgeContract,
});

export type Contract = typeof contract;
