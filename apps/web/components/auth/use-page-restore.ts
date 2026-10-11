"use client";

import * as React from "react";

/**
 * Clears a form's pending state when the page comes back from the
 * back/forward cache. Leaving for Google freezes the page as it was, so
 * without this the Back button returns to "Opening Google…" with every button
 * disabled.
 *
 * `clearPending` is a state setter, so it is stable across renders.
 */
export function useClearPendingOnRestore(clearPending: (value: null) => void) {
    React.useEffect(() => {
        function onPageShow(event: PageTransitionEvent) {
            if (event.persisted) clearPending(null);
        }
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, [clearPending]);
}
