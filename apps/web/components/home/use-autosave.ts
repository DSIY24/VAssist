"use client";

import * as React from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Saves changes as they are made, one request at a time. Changes queued while
 * a request is in flight are merged and sent next, so the last value of a
 * field always wins. A failed patch is kept and sent again by `retry` or with
 * the next change: nothing the owner entered is dropped.
 */
export function useAutosave<Patch extends object>(
    save: (patch: Patch) => Promise<unknown>,
) {
    const [status, setStatus] = React.useState<SaveStatus>("idle");
    const pending = React.useRef<Partial<Patch>>({});
    const running = React.useRef(false);
    const latestSave = React.useRef(save);
    React.useEffect(() => {
        latestSave.current = save;
    });

    const flush = React.useCallback(async () => {
        if (running.current || Object.keys(pending.current).length === 0) {
            return;
        }
        running.current = true;
        setStatus("saving");
        let failed = false;
        while (Object.keys(pending.current).length > 0) {
            const patch = pending.current;
            pending.current = {};
            try {
                await latestSave.current(patch as Patch);
            } catch {
                // Newer values for the same fields stay on top.
                pending.current = { ...patch, ...pending.current };
                failed = true;
                break;
            }
        }
        running.current = false;
        setStatus(failed ? "error" : "saved");
    }, []);

    const queue = React.useCallback(
        (patch: Partial<Patch>) => {
            pending.current = { ...pending.current, ...patch };
            void flush();
        },
        [flush],
    );

    return { status, queue, retry: flush };
}
