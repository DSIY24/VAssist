"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileTextIcon,
    InfoIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    TypeIcon,
    UploadIcon,
    XIcon,
} from "lucide-react";
import {
    SOURCE_FILE_ACCEPT,
    SOURCE_FILE_TYPES,
    sourceFileExtension,
    sourceFileNameSchema,
    sourceFileSizeSchema,
    type Source,
    type SourceStatus,
} from "@vassist/shared";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { hardNavigate } from "@/lib/navigation";
import { client, orpc } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";
import {
    HomeSection,
    LocalDateTime,
    errorCode,
    formatBytes,
} from "./home-parts";
import { TextSourceDialog, type TextSourceTarget } from "./text-source-dialog";

const STATUS: Record<
    SourceStatus,
    { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
    uploaded: { label: "Uploaded", variant: "secondary" },
    processing: { label: "Processing", variant: "outline" },
    ready: { label: "Ready", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
};

/** A file on its way to the bucket, or one that didn't make it. */
type Upload = {
    key: number;
    name: string;
    /** 0 to 100 while uploading. */
    progress: number;
    error: string | null;
};

/** PUTs a file to a presigned URL, reporting progress as a percentage. */
function putFile({
    url,
    headers,
    file,
    onProgress,
}: {
    url: string;
    headers: Record<string, string>;
    file: File;
    onProgress: (percent: number) => void;
}) {
    return new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", url);
        for (const [name, value] of Object.entries(headers)) {
            request.setRequestHeader(name, value);
        }
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) resolve();
            else reject(new Error(`Upload failed with ${request.status}`));
        };
        request.onerror = () => reject(new Error("Upload failed"));
        request.onabort = () => reject(new Error("Upload aborted"));
        request.send(file);
    });
}

/** The errors whose message the contract wrote for the owner to read. */
const UPLOAD_ERROR_CODES = new Set([
    "CONFLICT",
    "NOT_FOUND",
    "PAYLOAD_TOO_LARGE",
]);

function uploadErrorMessage(error: unknown) {
    const code = errorCode(error);
    return error instanceof Error &&
        typeof code === "string" &&
        UPLOAD_ERROR_CODES.has(code)
        ? error.message
        : "Couldn't upload. Try again.";
}

function sourceKindLabel(source: Source) {
    if (source.kind === "text") return "Text source";
    const extension = sourceFileExtension(source.name);
    return extension ? SOURCE_FILE_TYPES[extension].label : "File";
}

function SourceRow({
    source,
    onEdit,
    onDelete,
}: {
    source: Source;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const status = STATUS[source.status];
    const Icon = source.kind === "text" ? TypeIcon : FileTextIcon;
    return (
        <li className="flex items-center gap-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon aria-hidden="true" className="size-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                        {source.name}
                    </p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                    {sourceKindLabel(source)}
                    {source.size !== null
                        ? ` · ${formatBytes(source.size)}`
                        : null}
                    {" · Updated "}
                    <LocalDateTime value={source.updatedAt} />
                </p>
                {source.error ? (
                    <p className="text-xs text-destructive">{source.error}</p>
                ) : null}
            </div>
            {source.kind === "text" ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${source.name}`}
                    onClick={onEdit}
                >
                    <PencilIcon />
                </Button>
            ) : null}
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${source.name}`}
                onClick={onDelete}
            >
                <Trash2Icon />
            </Button>
        </li>
    );
}

/**
 * The knowledge base (PRD 7.2): upload files, write text sources, and see
 * every source with its status. Sources are stored but not processed yet, and
 * the section says so.
 */
export function KnowledgeSection({
    sources,
    loading,
    failed,
    onRetry,
}: {
    sources: readonly Source[];
    loading: boolean;
    failed: boolean;
    onRetry: () => void;
}) {
    const queryClient = useQueryClient();
    const [uploads, setUploads] = React.useState<Upload[]>([]);
    const [dragging, setDragging] = React.useState(false);
    const [textTarget, setTextTarget] = React.useState<TextSourceTarget | null>(
        null,
    );
    // The source stays set while the dialog closes, so its name doesn't
    // vanish mid-animation.
    const [deleting, setDeleting] = React.useState<Source | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const nextKey = React.useRef(0);

    const refreshSources = React.useCallback(
        () =>
            queryClient.invalidateQueries({
                queryKey: orpc.knowledge.listSources.key(),
            }),
        [queryClient],
    );

    function patchUpload(key: number, patch: Partial<Upload>) {
        setUploads((current) =>
            current.map((upload) =>
                upload.key === key ? { ...upload, ...patch } : upload,
            ),
        );
    }

    async function uploadFile(file: File) {
        const key = nextKey.current++;
        const name = sourceFileNameSchema.safeParse(file.name);
        const size = sourceFileSizeSchema.safeParse(file.size);
        const invalid = !name.success
            ? name.error.issues[0]?.message
            : !size.success
              ? size.error.issues[0]?.message
              : null;
        setUploads((current) => [
            ...current,
            { key, name: file.name, progress: 0, error: invalid ?? null },
        ]);
        if (!name.success || !size.success) return;

        // A new source that never gets its file is removed again; a
        // replacement leaves the existing source and its old file as they
        // were.
        let created: string | null = null;
        try {
            const started = await client.knowledge.createUpload({
                name: name.data,
                size: size.data,
            });
            if (!started.replaces) created = started.source.id;
            await putFile({
                url: started.upload.url,
                headers: started.upload.headers,
                file,
                onProgress: (progress) => patchUpload(key, { progress }),
            });
            await client.knowledge.confirmUpload({ id: started.source.id });
            setUploads((current) =>
                current.filter((upload) => upload.key !== key),
            );
        } catch (error) {
            if (errorCode(error) === "UNAUTHORIZED") {
                hardNavigate("/login");
                return;
            }
            patchUpload(key, { error: uploadErrorMessage(error) });
            if (created) {
                await client.knowledge
                    .deleteSource({ id: created })
                    .catch(() => {});
            }
        } finally {
            await refreshSources();
        }
    }

    async function uploadFiles(files: FileList | File[]) {
        // One at a time, so two files with the same name can't race.
        for (const file of Array.from(files)) await uploadFile(file);
    }

    const remove = useMutation(
        orpc.knowledge.deleteSource.mutationOptions({
            onSettled: () => refreshSources(),
            onSuccess: () => setDeleteOpen(false),
            onError: (error) => {
                if (errorCode(error) === "UNAUTHORIZED") hardNavigate("/login");
                // Someone already deleted it: the list just needs refreshing.
                if (errorCode(error) === "NOT_FOUND") setDeleteOpen(false);
            },
        }),
    );

    return (
        <HomeSection
            id="knowledge-base"
            title="Knowledge base"
            description="The sources your agent answers from. Upload files, or write text here."
            action={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTextTarget({ mode: "create" })}
                >
                    <PlusIcon data-icon="inline-start" />
                    Add text
                </Button>
            }
        >
            <div className="flex flex-col gap-4">
                <label
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        void uploadFiles(event.dataTransfer.files);
                    }}
                    className={cn(
                        "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        dragging && "border-ring bg-muted/50",
                    )}
                >
                    <input
                        type="file"
                        multiple
                        accept={SOURCE_FILE_ACCEPT}
                        className="sr-only"
                        onChange={(event) => {
                            if (event.target.files) {
                                void uploadFiles(event.target.files);
                            }
                            // So the same file can be chosen again.
                            event.target.value = "";
                        }}
                    />
                    <UploadIcon
                        aria-hidden="true"
                        className="size-5 text-muted-foreground"
                    />
                    <span className="text-sm font-medium">
                        Drop files here, or click to upload
                    </span>
                    <span className="text-xs text-muted-foreground">
                        PDF, Markdown (.md) or text (.txt), up to 10 MB each. A
                        file with the same name replaces the one you have.
                    </span>
                </label>

                {uploads.length > 0 ? (
                    <ul aria-label="Uploads" className="flex flex-col gap-2">
                        {uploads.map((upload) => (
                            <li
                                key={upload.key}
                                className="flex items-center gap-3 rounded-lg border px-3 py-2"
                            >
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                    <p className="truncate text-sm font-medium">
                                        {upload.name}
                                    </p>
                                    {upload.error ? (
                                        <p
                                            role="alert"
                                            className="text-xs text-destructive"
                                        >
                                            {upload.error}
                                        </p>
                                    ) : (
                                        <Progress
                                            value={upload.progress}
                                            aria-label={`Uploading ${upload.name}`}
                                        />
                                    )}
                                </div>
                                {upload.error ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Dismiss ${upload.name}`}
                                        onClick={() =>
                                            setUploads((current) =>
                                                current.filter(
                                                    (item) =>
                                                        item.key !== upload.key,
                                                ),
                                            )
                                        }
                                    >
                                        <XIcon />
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {upload.progress}%
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : null}

                <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <InfoIcon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                    />
                    <p>
                        Sources are saved, but VAssist can&apos;t process them
                        yet. They stay &ldquo;Uploaded&rdquo; and your agent
                        stays off until processing arrives, so every
                        conversation comes to you.
                    </p>
                </div>

                {failed ? (
                    <div className="flex items-center gap-3">
                        <p role="alert" className="text-sm text-destructive">
                            Couldn&apos;t load your sources.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                        >
                            Try again
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                ) : sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No sources yet.
                    </p>
                ) : (
                    <ul
                        aria-label="Sources"
                        className="-my-3 flex flex-col divide-y"
                    >
                        {sources.map((source) => (
                            <SourceRow
                                key={source.id}
                                source={source}
                                onEdit={() =>
                                    setTextTarget({ mode: "edit", source })
                                }
                                onDelete={() => {
                                    remove.reset();
                                    setDeleting(source);
                                    setDeleteOpen(true);
                                }}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <TextSourceDialog
                target={textTarget}
                onClose={() => setTextTarget(null)}
            />

            <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    if (!open && !remove.isPending) setDeleteOpen(false);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this source?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{deleting?.name}&rdquo; is removed from your
                            knowledge base for good, and your agent stops using
                            it right away.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {remove.isError &&
                    errorCode(remove.error) !== "NOT_FOUND" ? (
                        <p role="alert" className="text-sm text-destructive">
                            Couldn&apos;t delete. Try again.
                        </p>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={remove.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={remove.isPending}
                            onClick={() => {
                                if (deleting) {
                                    remove.mutate({ id: deleting.id });
                                }
                            }}
                        >
                            {remove.isPending ? "Deleting…" : "Delete source"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </HomeSection>
    );
}
