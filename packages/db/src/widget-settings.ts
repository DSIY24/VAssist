// A workspace's widget settings. Every function takes `workspaceId`.
import { getDb } from "./client";

export type WidgetColor =
    "blue" | "indigo" | "violet" | "pink" | "red" | "orange" | "green";

export type WidgetPosition = "bottom_left" | "bottom_right";

/** The workspace columns the widget and its settings page read. */
export type WidgetSettingsRow = {
    id: string;
    name: string;
    /** Null until the owner sets one. */
    agentName: string | null;
    agentAvatarKey: string | null;
    greeting: string;
    widgetColor: WidgetColor;
    widgetPosition: WidgetPosition;
    allowedDomains: readonly string[];
    suggestedQuestions: readonly string[];
    snippetInstalledAt: string | null;
};

export type WidgetSettingsPatch = {
    agentName?: string | null;
    greeting?: string;
    widgetColor?: WidgetColor;
    widgetPosition?: WidgetPosition;
    allowedDomains?: readonly string[];
};

const COLUMNS = [
    "id",
    "name",
    "agentName",
    "agentAvatarKey",
    "greeting",
    "widgetColor",
    "widgetPosition",
    "allowedDomains",
    "suggestedQuestions",
    "snippetInstalledAt",
] as const;

export async function getWidgetSettings(
    workspaceId: string,
): Promise<WidgetSettingsRow | null> {
    return getDb()
        .orm.public.Workspace.where({ id: workspaceId })
        .select(...COLUMNS)
        .first();
}

/**
 * Changes the fields present in `patch` and leaves the rest. Returns the
 * settings after the update, or `null` when the workspace does not exist.
 */
export async function updateWidgetSettings({
    workspaceId,
    patch,
}: {
    workspaceId: string;
    patch: WidgetSettingsPatch;
}): Promise<WidgetSettingsRow | null> {
    const workspace = getDb().orm.public.Workspace.where({ id: workspaceId });
    if (Object.values(patch).every((value) => value === undefined)) {
        return workspace.select(...COLUMNS).first();
    }
    return workspace.select(...COLUMNS).update({
        ...(patch.agentName !== undefined && { agentName: patch.agentName }),
        ...(patch.greeting !== undefined && { greeting: patch.greeting }),
        ...(patch.widgetColor !== undefined && {
            widgetColor: patch.widgetColor,
        }),
        ...(patch.widgetPosition !== undefined && {
            widgetPosition: patch.widgetPosition,
        }),
        ...(patch.allowedDomains !== undefined && {
            allowedDomains: [...patch.allowedDomains],
        }),
        // The column's default only fills on insert.
        updatedAt: new Date().toISOString(),
    });
}
