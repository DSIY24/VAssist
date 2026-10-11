"use client";

import * as React from "react";
import { SendHorizontalIcon } from "lucide-react";

/** 4,000 characters per chat message (PRD L-3). */
const MAX_MESSAGE_LENGTH = 4000;

/** The visitor's message box. Enter sends, Shift+Enter starts a new line. */
export function WidgetComposer({
    onSend,
    disabled = false,
    placeholder = "Write a message…",
}: {
    onSend?: (body: string) => void;
    disabled?: boolean;
    placeholder?: string;
}) {
    const [body, setBody] = React.useState("");
    const canSend = !disabled && body.trim().length > 0;

    function send() {
        if (!canSend) return;
        onSend?.(body.trim());
        setBody("");
    }

    return (
        <form
            className="flex items-end gap-2 border-t p-3"
            onSubmit={(event) => {
                event.preventDefault();
                send();
            }}
        >
            <textarea
                value={body}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={disabled}
                placeholder={placeholder}
                aria-label="Message"
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                    if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                    ) {
                        event.preventDefault();
                        send();
                    }
                }}
                className="field-sizing-content max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
            />
            <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--widget-accent) text-(--widget-accent-foreground) outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
                <SendHorizontalIcon className="size-4" />
            </button>
        </form>
    );
}
