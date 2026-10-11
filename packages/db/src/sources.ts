// The knowledge base's sources. Every function takes `workspaceId`.
import { getDb } from "./client";
import { isUniqueViolation } from "./workspaces";

export type SourceKind = "file" | "text";
export type SourceStatus = "uploaded" | "processing" | "ready" | "failed";

/** A source without its text, which can be 50,000 characters long. */
export type SourceRow = {
    id: string;
    kind: SourceKind;
    name: string;
    storageKey: string | null;
    mime: string | null;
    /** The stored file's size, or a text source's size as UTF-8. */
    sizeBytes: number | null;
    status: SourceStatus;
    error: string | null;
    revision: number;
    createdAt: string;
    updatedAt: string;
};

export type TextSourceRow = SourceRow & { text: string };

/** A write that can lose to another source holding the name. */
export type SourceWriteResult =
    | { ok: true; source: SourceRow }
    | { ok: false; reason: "name_taken" | "not_found" };

/**
 * What a file source says until its file has arrived. There is no status for
 * "upload in progress", so a new file source starts as `failed` with this
 * reason and `completeFileUpload` clears it. An upload that is abandoned
 * leaves a row that tells the truth.
 */
export const UPLOAD_NOT_FINISHED = "The upload didn't finish. Upload it again.";

const COLUMNS = [
    "id",
    "kind",
    "name",
    "storageKey",
    "mime",
    "sizeBytes",
    "status",
    "error",
    "revision",
    "createdAt",
    "updatedAt",
] as const;

function now() {
    return new Date().toISOString();
}

/** A workspace's sources, newest first. */
export async function listSources(workspaceId: string): Promise<SourceRow[]> {
    return getDb()
        .orm.public.Source.where({ workspaceId })
        .select(...COLUMNS)
        .orderBy([
            (source) => source.createdAt.desc(),
            (source) => source.id.desc(),
        ])
        .all();
}

export async function getSource({
    workspaceId,
    id,
}: {
    workspaceId: string;
    id: string;
}): Promise<SourceRow | null> {
    return getDb()
        .orm.public.Source.where({ workspaceId, id })
        .select(...COLUMNS)
        .first();
}

/** A text source with its text, or `null` when `id` is not a text source. */
export async function getTextSource({
    workspaceId,
    id,
}: {
    workspaceId: string;
    id: string;
}): Promise<TextSourceRow | null> {
    const source = await getDb()
        .orm.public.Source.where({ workspaceId, id, kind: "text" })
        .select(...COLUMNS, "text")
        .first();
    return source ? { ...source, text: source.text ?? "" } : null;
}

/** True while the knowledge base has a ready source: the agent is on. */
export async function hasReadySource(workspaceId: string): Promise<boolean> {
    const source = await getDb()
        .orm.public.Source.where({ workspaceId, status: "ready" })
        .select("id")
        .first();
    return source !== null;
}

/**
 * The file source an upload goes to. A file source with this name is reused
 * unchanged, so its file is replaced in place and it keeps its key (PRD K-5);
 * otherwise a new one is created with `id` and `storageKey`, marked as not
 * uploaded yet. Nothing about an existing source changes until
 * `completeFileUpload`, so an abandoned replacement leaves the old version.
 */
export async function startFileUpload({
    workspaceId,
    id,
    name,
    storageKey,
    mime,
}: {
    workspaceId: string;
    id: string;
    name: string;
    storageKey: string;
    mime: string;
}): Promise<
    | { ok: true; source: SourceRow; replaces: boolean }
    | { ok: false; reason: "name_taken" }
> {
    const sources = getDb().orm.public.Source;
    const findByName = () =>
        sources
            .where({ workspaceId, name })
            .select(...COLUMNS)
            .first();
    const reuse = (existing: SourceRow) =>
        existing.kind === "file"
            ? ({ ok: true, source: existing, replaces: true } as const)
            : ({ ok: false, reason: "name_taken" } as const);

    const existing = await findByName();
    if (existing) return reuse(existing);
    try {
        const source = await sources.select(...COLUMNS).create({
            id,
            workspaceId,
            kind: "file",
            name,
            storageKey,
            mime,
            status: "failed",
            error: UPLOAD_NOT_FINISHED,
        });
        return { ok: true, source, replaces: false };
    } catch (error) {
        // Another request created the name between the read and the insert.
        if (!isUniqueViolation(error)) throw error;
        const raced = await findByName();
        if (!raced) throw error;
        return reuse(raced);
    }
}

/**
 * Records that a file source's file has arrived: it becomes `uploaded` with
 * the stored size, and its revision moves on because the content changed.
 */
export async function completeFileUpload({
    workspaceId,
    id,
    sizeBytes,
}: {
    workspaceId: string;
    id: string;
    sizeBytes: number;
}): Promise<SourceRow | null> {
    return getDb().transaction(async (tx) => {
        const source = tx.orm.public.Source.where({
            workspaceId,
            id,
            kind: "file",
        });
        const current = await source.select("revision").first();
        if (!current) return null;
        return source.select(...COLUMNS).update({
            sizeBytes,
            status: "uploaded",
            error: null,
            revision: current.revision + 1,
            updatedAt: now(),
        });
    });
}

/** Marks a source as failed with a readable reason. */
export async function failSource({
    workspaceId,
    id,
    error,
}: {
    workspaceId: string;
    id: string;
    error: string;
}): Promise<SourceRow | null> {
    return getDb()
        .orm.public.Source.where({ workspaceId, id })
        .select(...COLUMNS)
        .update({ status: "failed", error, updatedAt: now() });
}

export async function createTextSource({
    workspaceId,
    name,
    text,
}: {
    workspaceId: string;
    name: string;
    text: string;
}): Promise<SourceWriteResult> {
    try {
        const source = await getDb()
            .orm.public.Source.select(...COLUMNS)
            .create({
                workspaceId,
                kind: "text",
                name,
                text,
                mime: "text/plain",
                sizeBytes: Buffer.byteLength(text, "utf8"),
                status: "uploaded",
            });
        return { ok: true, source };
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        return { ok: false, reason: "name_taken" };
    }
}

/** Saves a text source's title and text. Saving sends it to be processed again. */
export async function updateTextSource({
    workspaceId,
    id,
    name,
    text,
}: {
    workspaceId: string;
    id: string;
    name: string;
    text: string;
}): Promise<SourceWriteResult> {
    try {
        const updated = await getDb().transaction(async (tx) => {
            const source = tx.orm.public.Source.where({
                workspaceId,
                id,
                kind: "text",
            });
            const current = await source.select("revision").first();
            if (!current) return null;
            return source.select(...COLUMNS).update({
                name,
                text,
                sizeBytes: Buffer.byteLength(text, "utf8"),
                status: "uploaded",
                error: null,
                revision: current.revision + 1,
                updatedAt: now(),
            });
        });
        return updated
            ? { ok: true, source: updated }
            : { ok: false, reason: "not_found" };
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        return { ok: false, reason: "name_taken" };
    }
}

/** Deletes a source and returns it, so the caller can delete its file. */
export async function deleteSource({
    workspaceId,
    id,
}: {
    workspaceId: string;
    id: string;
}): Promise<SourceRow | null> {
    return getDb()
        .orm.public.Source.where({ workspaceId, id })
        .select(...COLUMNS)
        .delete();
}
