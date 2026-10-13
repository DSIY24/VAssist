import "server-only";
import {
    getWidgetSettings,
    hasReadySource,
    updateWidgetSettings,
    type WidgetSettingsRow,
} from "@vassist/db";
import type { WidgetSettings } from "@vassist/shared";
import { ownerProcedure } from "./orpc";

async function toWidgetSettings(
    row: WidgetSettingsRow,
): Promise<WidgetSettings> {
    return {
        workspaceId: row.id,
        workspaceName: row.name,
        agentName: row.agentName,
        // Avatar uploads are not built yet (TECH-STACK section 10), so every
        // workspace uses the generated avatar.
        agentAvatarUrl: null,
        greeting: row.greeting,
        color: row.widgetColor,
        position: row.widgetPosition,
        allowedDomains: [...row.allowedDomains],
        suggestedQuestions: [...row.suggestedQuestions],
        agentOn: await hasReadySource(row.id),
        snippetInstalled: row.snippetInstalledAt !== null,
    };
}

const getSettings = ownerProcedure.widget.getSettings.handler(
    async ({ context, errors }) => {
        const row = await getWidgetSettings(context.workspaceId);
        // The membership was just read, so only a workspace deleted in between
        // gets here.
        if (!row) throw errors.FORBIDDEN();
        return toWidgetSettings(row);
    },
);

const updateSettings = ownerProcedure.widget.updateSettings.handler(
    async ({ context, input, errors }) => {
        const row = await updateWidgetSettings({
            workspaceId: context.workspaceId,
            patch: {
                // An empty name restores the default, which is stored as null.
                agentName:
                    input.agentName === undefined
                        ? undefined
                        : input.agentName || null,
                greeting: input.greeting,
                widgetColor: input.color,
                widgetPosition: input.position,
                allowedDomains: input.allowedDomains,
            },
        });
        if (!row) throw errors.FORBIDDEN();
        return toWidgetSettings(row);
    },
);

export const widgetRouter = {
    getSettings,
    updateSettings,
};
