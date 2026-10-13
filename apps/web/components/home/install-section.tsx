"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { buildSnippet } from "@vassist/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeSection } from "./home-parts";

// The address the snippet points at. Set in production; in development the
// page's own origin is used, which the server can't know.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || null;

function subscribe() {
    return () => {};
}

function useAppOrigin() {
    return React.useSyncExternalStore(
        subscribe,
        () => APP_URL ?? window.location.origin,
        () => APP_URL,
    );
}

type SyntaxKind = "punctuation" | "tag" | "attribute" | "string" | "plain";

const SYNTAX_CLASSES: Record<SyntaxKind, string | undefined> = {
    punctuation: "text-muted-foreground",
    tag: "text-syntax-tag",
    attribute: "text-syntax-attribute",
    string: "text-syntax-string",
    plain: undefined,
};

// Brackets and `=`, a quoted value, a name, then whitespace or anything else.
const SNIPPET_PARTS = /(<\/?|\/?>|=)|("[^"]*")|([^\s<>="/]+)|(\s+|[\s\S])/g;

/** Splits the snippet's HTML into the parts that are coloured differently. */
function tokenizeSnippet(snippet: string) {
    const tokens: { kind: SyntaxKind; text: string }[] = [];
    // A name right after `<` or `</` is the tag; any other is an attribute.
    let afterBracket = false;
    for (const [text, punctuation, string, name] of snippet.matchAll(
        SNIPPET_PARTS,
    )) {
        let kind: SyntaxKind = "plain";
        if (punctuation) kind = "punctuation";
        else if (string) kind = "string";
        else if (name) kind = afterBracket ? "tag" : "attribute";
        tokens.push({ kind, text });
        afterBracket = punctuation === "<" || punctuation === "</";
    }
    return tokens;
}

/** The snippet for this workspace, with a button to copy it (PRD W-1). */
export function InstallSection({ workspaceId }: { workspaceId: string }) {
    const origin = useAppOrigin();
    const snippet = origin ? buildSnippet({ origin, workspaceId }) : null;
    const [copied, setCopied] = React.useState<"yes" | "failed" | null>(null);
    const timer = React.useRef<number | undefined>(undefined);
    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    async function copy() {
        if (!snippet) return;
        let result: "yes" | "failed" = "yes";
        try {
            await navigator.clipboard.writeText(snippet);
        } catch {
            result = "failed";
        }
        setCopied(result);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), 2500);
    }

    return (
        <HomeSection
            id="install"
            title="Install"
            description={
                <>
                    Paste this snippet into your website&apos;s HTML, just
                    before the closing <code>&lt;/body&gt;</code> tag, on every
                    page where the widget should appear.
                </>
            }
        >
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
                    {snippet ? (
                        <pre className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs leading-relaxed">
                            <code>
                                {tokenizeSnippet(snippet).map(
                                    (token, index) => (
                                        <span
                                            key={index}
                                            className={
                                                SYNTAX_CLASSES[token.kind]
                                            }
                                        >
                                            {token.text}
                                        </span>
                                    ),
                                )}
                            </code>
                        </pre>
                    ) : (
                        // As tall as the snippet's five lines.
                        <Skeleton className="my-1 h-[5lh] flex-1 bg-foreground/10 font-mono text-xs leading-relaxed" />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!snippet}
                        onClick={() => void copy()}
                    >
                        {copied === "yes" ? (
                            <CheckIcon data-icon="inline-start" />
                        ) : (
                            <CopyIcon data-icon="inline-start" />
                        )}
                        {copied === "yes" ? "Copied" : "Copy snippet"}
                    </Button>
                </div>
                <p role="status" className="sr-only">
                    {copied === "yes" ? "Snippet copied." : null}
                </p>
                {copied === "failed" ? (
                    <p role="alert" className="text-sm text-destructive">
                        Couldn&apos;t copy. Select the snippet and copy it by
                        hand.
                    </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                    The widget isn&apos;t available yet: it arrives with the
                    next VAssist update. Until then, the snippet shows nothing
                    on your website.
                </p>
            </div>
        </HomeSection>
    );
}
