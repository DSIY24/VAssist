"use client";

import * as React from "react";
import {
    MESSAGE_MAX_LENGTH,
    messageBodySchema,
    type ConversationState,
} from "@vassist/shared";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Shown once the draft gets close to the limit.
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 500;

/**
 * The reply box. Enter sends and Shift+Enter starts a new line. While the
 * agent or nobody is replying it says that sending takes over.
 */
export function Composer({
    state,
    draft,
    onDraftChange,
    onSend,
}: {
    state: Exclude<ConversationState, "closed">;
    draft: string;
    onDraftChange: (draft: string) => void;
    onSend: (body: string) => void;
}) {
    const hintId = React.useId();
    const length = draft.trim().length;
    const tooLong = length > MESSAGE_MAX_LENGTH;
    const canSend = length > 0 && !tooLong;

    function send() {
        const parsed = messageBodySchema.safeParse(draft);
        if (!parsed.success) return;
        onSend(parsed.data);
    }

    return (
        <form
            className="shrink-0 border-t p-3"
            onSubmit={(event) => {
                event.preventDefault();
                send();
            }}
        >
            <div className="flex items-end gap-2">
                <Textarea
                    aria-label="Reply to the visitor"
                    aria-describedby={hintId}
                    aria-invalid={tooLong || undefined}
                    placeholder="Write a reply…"
                    rows={1}
                    value={draft}
                    className="max-h-48 min-h-9 resize-none"
                    onChange={(event) => onDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            // Enter that confirms an IME composition.
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();
                            send();
                        }
                    }}
                />
                <Button type="submit" size="icon-lg" disabled={!canSend}>
                    <SendIcon />
                    <span className="sr-only">Send reply</span>
                </Button>
            </div>
            <p
                id={hintId}
                className="mt-1.5 flex justify-between gap-3 px-1 text-xs text-muted-foreground"
            >
                <span>
                    {state === "ai"
                        ? "Sending a reply takes over from the agent."
                        : state === "waiting"
                          ? "Sending a reply takes over the conversation."
                          : "Enter to send, Shift+Enter for a new line."}
                </span>
                {length >= COUNTER_FROM ? (
                    <span
                        className={cn(
                            "shrink-0 tabular-nums",
                            tooLong && "text-destructive",
                        )}
                    >
                        {length.toLocaleString("en-US")} /{" "}
                        {MESSAGE_MAX_LENGTH.toLocaleString("en-US")}
                    </span>
                ) : null}
            </p>
        </form>
    );
}
