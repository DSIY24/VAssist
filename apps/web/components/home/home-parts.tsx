"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./use-autosave";

/** One titled block of the Home page. `id` is what the checklist links to. */
export function HomeSection({
    id,
    title,
    description,
    action,
    children,
}: {
    id: string;
    title: string;
    description: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="scroll-mt-4 rounded-xl border bg-card text-card-foreground"
        >
            <div className="flex items-start gap-4 border-b p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 id={`${id}-title`} className="text-base font-medium">
                        {title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

/** The quiet "Saving… / Saved / Couldn't save" line of an autosaved form. */
export function SaveIndicator({
    status,
    onRetry,
    className,
}: {
    status: SaveStatus;
    onRetry: () => void;
    className?: string;
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 text-sm text-muted-foreground",
                className,
            )}
        >
            {status === "saving" ? (
                <>
                    <Spinner aria-hidden="true" className="size-3.5" />
                    Saving…
                </>
            ) : null}
            {status === "saved" ? (
                <>
                    <CheckIcon aria-hidden="true" className="size-3.5" />
                    Saved
                </>
            ) : null}
            {status === "error" ? (
                <>
                    <span className="text-destructive">
                        Couldn&apos;t save.
                    </span>
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={onRetry}
                    >
                        Try again
                    </Button>
                </>
            ) : null}
        </div>
    );
}

const dateFormat = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
});

function subscribe() {
    return () => {};
}

/**
 * A timestamp in the viewer's own time zone. The server doesn't know that
 * zone, so it renders nothing and the browser fills the text in.
 */
export function LocalDateTime({ value }: { value: string }) {
    const text = React.useSyncExternalStore(
        subscribe,
        () => dateFormat.format(new Date(value)),
        () => null,
    );
    return <time dateTime={value}>{text}</time>;
}

/** 1536 → "1.5 KB". */
export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The error code of a failed request, such as `UNAUTHORIZED`. */
export function errorCode(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
}
