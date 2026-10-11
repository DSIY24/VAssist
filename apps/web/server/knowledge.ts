import "server-only";
import { randomUUID } from "node:crypto";
import {
    completeFileUpload,
    createTextSource as insertTextSource,
    deleteSource as removeSource,
    failSource,
    getSource,
    getTextSource as findTextSource,
    listSources as findSources,
    startFileUpload,
    updateTextSource as saveTextSource,
    type SourceRow,
} from "@vassist/db";
import {
    MAX_SOURCE_FILE_BYTES,
    SOURCE_FILE_TYPES,
    sourceFileExtension,
    sourceStorageKey,
    type Source,
} from "@vassist/shared";
import {
    deleteObject,
    headObject,
    presignUpload,
    UPLOADS_BUCKET,
} from "@/lib/storage/client";
import { ownerProcedure } from "./orpc";

/** How long a presigned upload URL stays valid, in seconds. */
const UPLOAD_URL_TTL = 5 * 60;

function toSource(row: SourceRow): Source {
    return {
        id: row.id,
        kind: row.kind,
        name: row.name,
        mime: row.mime,
        size: row.sizeBytes,
        status: row.status,
        error: row.error,
        // Postgres writes "2026-10-11 15:51:40.07+00", which not every
        // browser parses. ISO 8601 is safe everywhere.
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
    };
}

// Real time: when the workspace room exists, every write below publishes
// `source.updated` or `source.deleted` (and `knowledge.updated` when the agent
// turns on or off) after it is saved. Nothing is published yet.

const listSources = ownerProcedure.knowledge.listSources.handler(
    async ({ context }) =>
        (await findSources(context.workspaceId)).map(toSource),
);

const getTextSource = ownerProcedure.knowledge.getTextSource.handler(
    async ({ context, input, errors }) => {
        const row = await findTextSource({
            workspaceId: context.workspaceId,
            id: input.id,
        });
        if (!row) throw errors.NOT_FOUND();
        return { ...toSource(row), text: row.text };
    },
);

const createUpload = ownerProcedure.knowledge.createUpload.handler(
    async ({ context, input, errors }) => {
        // The contract's schema only lets accepted extensions through.
        const extension = sourceFileExtension(input.name);
        if (!extension) throw errors.CONFLICT();
        const { mime } = SOURCE_FILE_TYPES[extension];
        const id = randomUUID();
        const started = await startFileUpload({
            workspaceId: context.workspaceId,
            id,
            name: input.name,
            storageKey: sourceStorageKey({
                workspaceId: context.workspaceId,
                sourceId: id,
                extension,
            }),
            mime,
        });
        if (!started.ok) throw errors.CONFLICT();
        const { source, replaces } = started;
        if (!source.storageKey) throw errors.CONFLICT();
        const upload = await presignUpload({
            bucket: UPLOADS_BUCKET,
            // A reused source keeps its own key, so the file is replaced in
            // place.
            key: source.storageKey,
            contentType: mime,
            contentLength: input.size,
            expiresIn: UPLOAD_URL_TTL,
        });
        return { source: toSource(source), replaces, upload };
    },
);

const confirmUpload = ownerProcedure.knowledge.confirmUpload.handler(
    async ({ context, input, errors }) => {
        const { workspaceId } = context;
        const source = await getSource({ workspaceId, id: input.id });
        if (!source || source.kind !== "file" || !source.storageKey) {
            throw errors.NOT_FOUND();
        }
        const object = await headObject({
            bucket: UPLOADS_BUCKET,
            key: source.storageKey,
        });
        if (!object) throw errors.CONFLICT();
        // The signed `Content-Length` already holds the PUT to the declared
        // size. This is the check on what was actually stored.
        if (object.size > MAX_SOURCE_FILE_BYTES) {
            await deleteObject({
                bucket: UPLOADS_BUCKET,
                key: source.storageKey,
            });
            await failSource({
                workspaceId,
                id: source.id,
                error: "The file is larger than 10 MB.",
            });
            throw errors.PAYLOAD_TOO_LARGE();
        }
        const updated = await completeFileUpload({
            workspaceId,
            id: source.id,
            sizeBytes: object.size,
        });
        if (!updated) throw errors.NOT_FOUND();
        return toSource(updated);
    },
);

const createTextSource = ownerProcedure.knowledge.createTextSource.handler(
    async ({ context, input, errors }) => {
        const result = await insertTextSource({
            workspaceId: context.workspaceId,
            name: input.name,
            text: input.text,
        });
        if (!result.ok) throw errors.CONFLICT();
        return toSource(result.source);
    },
);

const updateTextSource = ownerProcedure.knowledge.updateTextSource.handler(
    async ({ context, input, errors }) => {
        const result = await saveTextSource({
            workspaceId: context.workspaceId,
            id: input.id,
            name: input.name,
            text: input.text,
        });
        if (result.ok) return toSource(result.source);
        throw result.reason === "not_found"
            ? errors.NOT_FOUND()
            : errors.CONFLICT();
    },
);

const deleteSource = ownerProcedure.knowledge.deleteSource.handler(
    async ({ context, input, errors }) => {
        // The row goes first, so the agent stops using the source right away
        // (PRD K-4) even if the file can't be deleted.
        const source = await removeSource({
            workspaceId: context.workspaceId,
            id: input.id,
        });
        if (!source) throw errors.NOT_FOUND();
        if (source.storageKey) {
            try {
                await deleteObject({
                    bucket: UPLOADS_BUCKET,
                    key: source.storageKey,
                });
            } catch (error) {
                // The source is gone either way; this leaves an orphan file.
                console.error(
                    `Could not delete ${source.storageKey} from ${UPLOADS_BUCKET}`,
                    error,
                );
            }
        }
        return { id: source.id };
    },
);

export const knowledgeRouter = {
    listSources,
    getTextSource,
    createUpload,
    confirmUpload,
    createTextSource,
    updateTextSource,
    deleteSource,
};
