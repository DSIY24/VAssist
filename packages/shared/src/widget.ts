// Widget settings: the Home page's schemas and procedures.
import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";

/** Where the launcher bubble and the widget sit on the page (PRD D-9). */
export const WIDGET_POSITIONS = ["bottom_left", "bottom_right"] as const;
export const widgetPositionSchema = z.enum(WIDGET_POSITIONS);
export type WidgetPosition = z.infer<typeof widgetPositionSchema>;

/** The accent colours an owner can pick. Blue is the default (PRD D-9). */
export const WIDGET_COLORS = [
    "blue",
    "indigo",
    "violet",
    "pink",
    "red",
    "orange",
    "green",
] as const;
export const widgetColorSchema = z.enum(WIDGET_COLORS);
export type WidgetColor = z.infer<typeof widgetColorSchema>;

/**
 * The widget accent palette: each colour with the text colour that stays
 * readable on it (at least 4.5:1). The one place these values live: the
 * widget, its preview and the embed script all read them from here. Recorded
 * in docs/DESIGN.md section 2.
 */
export const WIDGET_ACCENTS: Record<
    WidgetColor,
    { label: string; background: string; foreground: string }
> = {
    blue: { label: "Blue", background: "#2563eb", foreground: "#ffffff" },
    indigo: { label: "Indigo", background: "#4f46e5", foreground: "#ffffff" },
    violet: { label: "Violet", background: "#7c3aed", foreground: "#ffffff" },
    pink: { label: "Pink", background: "#db2777", foreground: "#ffffff" },
    red: { label: "Red", background: "#dc2626", foreground: "#ffffff" },
    orange: { label: "Orange", background: "#f97316", foreground: "#161616" },
    green: { label: "Green", background: "#15803d", foreground: "#ffffff" },
};

export const AGENT_NAME_MAX_LENGTH = 40;
export const GREETING_MAX_LENGTH = 240;
export const MAX_ALLOWED_DOMAINS = 20;

/** The agent's name when the owner has not set one. */
export function defaultAgentName(workspaceName: string) {
    return `${workspaceName} Agent`;
}

/** The name visitors see: the owner's, or the default. */
export function resolveAgentName(
    agentName: string | null | undefined,
    workspaceName: string,
) {
    return agentName?.trim() || defaultAgentName(workspaceName);
}

/**
 * The agent's generated avatar, used until the owner uploads one. DiceBear's
 * "glass" style, seeded with the workspace id so it never changes.
 */
export function defaultAgentAvatarUrl(workspaceId: string) {
    return `https://api.dicebear.com/10.x/glass/svg?seed=${encodeURIComponent(workspaceId)}`;
}

/**
 * The snippet an owner pastes into their website, one attribute per line. The
 * embed script reads the workspace from `data-workspace` on its own `<script>`
 * tag.
 */
export function buildSnippet({
    origin,
    workspaceId,
}: {
    origin: string;
    workspaceId: string;
}) {
    return [
        "<script",
        `    src="${origin.replace(/\/+$/, "")}/embed.js"`,
        `    data-workspace="${workspaceId}"`,
        "    async",
        "></script>",
    ].join("\n");
}

/** Empty means "use the default name". */
export const agentNameSchema = z
    .string()
    .trim()
    .max(
        AGENT_NAME_MAX_LENGTH,
        `Use ${AGENT_NAME_MAX_LENGTH} characters or fewer.`,
    );

export const greetingSchema = z
    .string()
    .trim()
    .min(1, "Enter a greeting.")
    .max(
        GREETING_MAX_LENGTH,
        `Use ${GREETING_MAX_LENGTH} characters or fewer.`,
    );

const HOSTNAME_PATTERN =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * What an owner types or pastes, reduced to a bare lowercase hostname: the
 * scheme, credentials, port, path, query and a trailing dot are dropped.
 */
export function normalizeDomain(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
        .replace(/[/?#].*$/, "")
        .replace(/^.*@/, "")
        .replace(/:\d*$/, "")
        .replace(/\.$/, "");
}

/** An allowed domain: a hostname such as `www.example.com`. */
export const allowedDomainSchema = z
    .string()
    .trim()
    .min(1, "Enter a domain.")
    .transform(normalizeDomain)
    .pipe(
        z.string().regex(HOSTNAME_PATTERN, "Enter a domain like example.com."),
    );

export const allowedDomainsSchema = z
    .array(allowedDomainSchema)
    .max(MAX_ALLOWED_DOMAINS, `Add up to ${MAX_ALLOWED_DOMAINS} domains.`)
    .refine((domains) => new Set(domains).size === domains.length, {
        message: "Each domain can be added once.",
    });

/** The fields of the widget settings form on the Home page. */
export const widgetSettingsFormSchema = z.object({
    agentName: agentNameSchema,
    greeting: greetingSchema,
    color: widgetColorSchema,
    position: widgetPositionSchema,
});
export type WidgetSettingsForm = z.infer<typeof widgetSettingsFormSchema>;

export const widgetSettingsSchema = z
    .object({
        workspaceId: z.uuid(),
        workspaceName: z.string(),
        // Null until the owner sets one: the default follows the workspace
        // name (see `resolveAgentName`).
        agentName: z.string().nullable(),
        // Null until an avatar is uploaded: the generated one is used.
        agentAvatarUrl: z.string().nullable(),
        greeting: z.string(),
        color: widgetColorSchema,
        position: widgetPositionSchema,
        allowedDomains: z.array(z.string()),
        suggestedQuestions: z.array(z.string()),
        // True while the knowledge base has a ready source (PRD AI-1).
        agentOn: z.boolean(),
        snippetInstalled: z.boolean(),
    })
    .meta({ id: "WidgetSettings" });
export type WidgetSettings = z.infer<typeof widgetSettingsSchema>;

/** A partial update: only the fields sent are changed. */
export const updateWidgetSettingsInputSchema = z.object({
    agentName: agentNameSchema.optional(),
    greeting: greetingSchema.optional(),
    color: widgetColorSchema.optional(),
    position: widgetPositionSchema.optional(),
    allowedDomains: allowedDomainsSchema.optional(),
});
export type UpdateWidgetSettingsInput = z.infer<
    typeof updateWidgetSettingsInputSchema
>;

const getSettings = oc
    .meta(
        openapi({
            method: "GET",
            path: "/widget/settings",
            tags: ["Widget"],
            summary: "Get the workspace's widget settings",
        }),
    )
    .output(widgetSettingsSchema);

const updateSettings = oc
    .meta(
        openapi({
            method: "PATCH",
            path: "/widget/settings",
            tags: ["Widget"],
            summary: "Update the workspace's widget settings",
            description:
                "Changes only the fields that are sent. An empty agent name restores the default.",
        }),
    )
    .input(updateWidgetSettingsInputSchema)
    .output(widgetSettingsSchema);

export const widgetContract = {
    getSettings,
    updateSettings,
};
