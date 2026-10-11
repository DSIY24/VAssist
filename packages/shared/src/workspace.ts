import * as z from "zod";

/** The workspace name, as typed in the first-run step and in settings. */
export const workspaceNameSchema = z
    .string()
    .trim()
    .min(1, "Enter your business name.")
    .max(80, "Use 80 characters or fewer.");

export const createWorkspaceInputSchema = z.object({
    name: workspaceNameSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;

export const workspaceSchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
    })
    .meta({ id: "Workspace" });
export type Workspace = z.infer<typeof workspaceSchema>;
