// The knowledge base: sources, their schemas and procedures.
import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";

export const SOURCE_KINDS = ["file", "text"] as const;
export const sourceKindSchema = z.enum(SOURCE_KINDS);
export type SourceKind = z.infer<typeof sourceKindSchema>;

export const SOURCE_STATUSES = [
    "uploaded",
    "processing",
    "ready",
    "failed",
] as const;
export const sourceStatusSchema = z.enum(SOURCE_STATUSES);
export type SourceStatus = z.infer<typeof sourceStatusSchema>;

/** The files a knowledge base accepts, by extension (PRD K-1). */
export const SOURCE_FILE_TYPES = {
    pdf: { mime: "application/pdf", label: "PDF" },
    md: { mime: "text/markdown", label: "Markdown" },
    txt: { mime: "text/plain", label: "Text" },
} as const;
export type SourceFileExtension = keyof typeof SOURCE_FILE_TYPES;

/** For a file input's `accept`. */
export const SOURCE_FILE_ACCEPT = Object.keys(SOURCE_FILE_TYPES)
    .map((extension) => `.${extension}`)
    .join(",");

/** 10 MB per file (PRD L-3). */
export const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
/** 50,000 characters per text source (PRD L-3). */
export const MAX_TEXT_SOURCE_CHARS = 50_000;
export const SOURCE_NAME_MAX_LENGTH = 200;

/** The accepted extension of a file name, or `null`. */
export function sourceFileExtension(name: string): SourceFileExtension | null {
    const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
    return name.includes(".") && extension in SOURCE_FILE_TYPES
        ? (extension as SourceFileExtension)
        : null;
}

/**
 * Where a file source lives in the `uploads` bucket. The ingest function
 * reads the workspace and source ids back out of this key.
 */
export function sourceStorageKey({
    workspaceId,
    sourceId,
    extension,
}: {
    workspaceId: string;
    sourceId: string;
    extension: SourceFileExtension;
}) {
    return `workspaces/${workspaceId}/sources/${sourceId}.${extension}`;
}

const sourceNameSchema = z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(
        SOURCE_NAME_MAX_LENGTH,
        `Use ${SOURCE_NAME_MAX_LENGTH} characters or fewer.`,
    );

export const sourceFileNameSchema = z
    .string()
    .trim()
    .min(1, "The file needs a name.")
    .max(
        SOURCE_NAME_MAX_LENGTH,
        `Use a file name of ${SOURCE_NAME_MAX_LENGTH} characters or fewer.`,
    )
    .refine((name) => sourceFileExtension(name) !== null, {
        message: "Upload a PDF, Markdown (.md) or text (.txt) file.",
    });

export const sourceFileSizeSchema = z
    .number()
    .int()
    .min(1, "The file is empty.")
    .max(MAX_SOURCE_FILE_BYTES, "Upload a file of 10 MB or less.");

export const sourceSchema = z
    .object({
        id: z.uuid(),
        kind: sourceKindSchema,
        // The file name, or the title of a text source.
        name: z.string(),
        mime: z.string().nullable(),
        // In bytes. Null for a file that has not finished uploading.
        size: z.number().int().nullable(),
        status: sourceStatusSchema,
        // A readable reason when `status` is `failed`.
        error: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })
    .meta({ id: "Source" });
export type Source = z.infer<typeof sourceSchema>;

export const textSourceSchema = sourceSchema
    .extend({ text: z.string() })
    .meta({ id: "TextSource" });
export type TextSource = z.infer<typeof textSourceSchema>;

export const textSourceInputSchema = z.object({
    name: sourceNameSchema,
    text: z
        .string()
        .trim()
        .min(1, "Enter some text.")
        .max(
            MAX_TEXT_SOURCE_CHARS,
            `Use ${MAX_TEXT_SOURCE_CHARS.toLocaleString("en-US")} characters or fewer.`,
        ),
});
export type TextSourceInput = z.infer<typeof textSourceInputSchema>;

const sourceIdInputSchema = z.object({ id: z.uuid() });

const NAME_TAKEN = {
    CONFLICT: { message: "Another source already uses this name." },
};
const SOURCE_NOT_FOUND = {
    NOT_FOUND: { message: "This source no longer exists." },
};

const listSources = oc
    .meta(
        openapi({
            method: "GET",
            path: "/knowledge/sources",
            tags: ["Knowledge base"],
            summary: "List the knowledge base's sources",
            description: "Newest first.",
        }),
    )
    .output(z.array(sourceSchema));

const getTextSource = oc
    .meta(
        openapi({
            method: "GET",
            path: "/knowledge/text-sources/{id}",
            tags: ["Knowledge base"],
            summary: "Get a text source with its text",
        }),
    )
    .errors(SOURCE_NOT_FOUND)
    .input(sourceIdInputSchema)
    .output(textSourceSchema);

const createUpload = oc
    .meta(
        openapi({
            method: "POST",
            path: "/knowledge/uploads",
            tags: ["Knowledge base"],
            summary: "Start a file upload",
            description:
                "Creates the source, or reuses the file source with the same name, and returns a short-lived URL to PUT the file to. Call `confirmUpload` once the PUT has finished.",
        }),
    )
    .errors(NAME_TAKEN)
    .input(
        z.object({
            name: sourceFileNameSchema,
            size: sourceFileSizeSchema,
        }),
    )
    .output(
        z.object({
            source: sourceSchema,
            // True when a file source with this name already existed.
            replaces: z.boolean(),
            upload: z.object({
                url: z.url(),
                // Send exactly these headers with the PUT: they are signed.
                headers: z.record(z.string(), z.string()),
            }),
        }),
    );

const confirmUpload = oc
    .meta(
        openapi({
            method: "POST",
            path: "/knowledge/uploads/{id}/confirm",
            tags: ["Knowledge base"],
            summary: "Finish a file upload",
            description:
                "Checks that the file arrived and is an accepted size, then records it as uploaded.",
        }),
    )
    .errors({
        ...SOURCE_NOT_FOUND,
        CONFLICT: { message: "The file didn't arrive. Upload it again." },
        PAYLOAD_TOO_LARGE: { message: "Upload a file of 10 MB or less." },
    })
    .input(sourceIdInputSchema)
    .output(sourceSchema);

const createTextSource = oc
    .meta(
        openapi({
            method: "POST",
            path: "/knowledge/text-sources",
            tags: ["Knowledge base"],
            summary: "Add a text source",
        }),
    )
    .errors(NAME_TAKEN)
    .input(textSourceInputSchema)
    .output(sourceSchema);

const updateTextSource = oc
    .meta(
        openapi({
            method: "PUT",
            path: "/knowledge/text-sources/{id}",
            tags: ["Knowledge base"],
            summary: "Edit a text source",
        }),
    )
    .errors({ ...SOURCE_NOT_FOUND, ...NAME_TAKEN })
    .input(textSourceInputSchema.extend({ id: z.uuid() }))
    .output(sourceSchema);

const deleteSource = oc
    .meta(
        openapi({
            method: "DELETE",
            path: "/knowledge/sources/{id}",
            tags: ["Knowledge base"],
            summary: "Delete a source",
            description: "Also deletes the stored file of a file source.",
        }),
    )
    .errors(SOURCE_NOT_FOUND)
    .input(sourceIdInputSchema)
    .output(z.object({ id: z.uuid() }));

export const knowledgeContract = {
    listSources,
    getTextSource,
    createUpload,
    confirmUpload,
    createTextSource,
    updateTextSource,
    deleteSource,
};
