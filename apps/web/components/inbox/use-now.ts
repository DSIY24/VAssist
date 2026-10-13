import * as React from "react";

const TICK = 30_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let current = 0;

function subscribe(onChange: () => void) {
    listeners.add(onChange);
    if (!timer) {
        current = Date.now();
        timer = setInterval(() => {
            current = Date.now();
            for (const listener of listeners) listener();
        }, TICK);
    }
    return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

/**
 * The current time, refreshed every half minute, or `0` on the server and
 * while hydrating. Anything that depends on the clock or the owner's timezone
 * (relative times, "Today", local times) renders only once this is non-zero,
 * so the server and the browser never disagree.
 */
export function useNow() {
    return React.useSyncExternalStore(
        subscribe,
        () => current || (current = Date.now()),
        () => 0,
    );
}
