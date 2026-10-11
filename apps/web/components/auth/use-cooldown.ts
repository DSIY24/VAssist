"use client";

import * as React from "react";

/**
 * Seconds left until `until` (a `Date.now()` timestamp, or `null` for none).
 *
 * The clock only moves inside the interval callback, and `start` takes its
 * timestamp from the event that calls it, so nothing reads the time while
 * rendering.
 */
export function useCooldown(initialStart: number | null, seconds: number) {
    const [state, setState] = React.useState(() => ({
        until: initialStart === null ? null : initialStart + seconds * 1000,
        now: initialStart ?? 0,
    }));
    const { until, now } = state;
    const remaining =
        until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
    const running = remaining > 0;

    React.useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => {
            setState((current) => ({ ...current, now: Date.now() }));
        }, 250);
        return () => window.clearInterval(id);
    }, [running]);

    const start = React.useCallback(() => {
        const startedAt = Date.now();
        setState({ until: startedAt + seconds * 1000, now: startedAt });
    }, [seconds]);

    return { remaining, start };
}
