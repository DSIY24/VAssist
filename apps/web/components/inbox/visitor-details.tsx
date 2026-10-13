"use client";

import type { Conversation } from "@vassist/shared";
import {
    HANDOFF_REASON_LABEL,
    formatDateTime,
    languageName,
    localTimeIn,
} from "./labels";
import { useNow } from "./use-now";

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-1.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 wrap-anywhere">
                {children ?? (
                    <span className="text-muted-foreground">Unknown</span>
                )}
            </dd>
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border-b px-4 py-3 last:border-b-0">
            <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {title}
            </h3>
            <dl>{children}</dl>
        </section>
    );
}

/** A page or referrer as a link, showing the address without its scheme. */
function PageLink({ url }: { url: string | null }) {
    if (!url) return null;
    let href: string | null = null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
            href = parsed.href;
        }
    } catch {
        // Not a URL: shown as plain text below.
    }
    const text = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!href) return <>{text}</>;
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            {text}
        </a>
    );
}

/** The visitor details beside a conversation (PRD section 4). */
export function VisitorDetails({
    conversation,
}: {
    conversation: Conversation;
}) {
    const now = useNow();
    const { visitor } = conversation;
    const location = [visitor.city, visitor.country].filter(Boolean).join(", ");
    const localTime = now ? localTimeIn(visitor.timezone, now) : null;

    return (
        <div className="flex flex-col">
            <Section title="Visitor">
                <Row label="Location">{location || null}</Row>
                <Row label="Local time">
                    {localTime ? (
                        <>
                            {localTime}
                            {visitor.timezone ? (
                                <span className="text-muted-foreground">
                                    {" "}
                                    ({visitor.timezone.replaceAll("_", " ")})
                                </span>
                            ) : null}
                        </>
                    ) : (
                        (visitor.timezone?.replaceAll("_", " ") ?? null)
                    )}
                </Row>
                <Row label="Language">{languageName(visitor.language)}</Row>
            </Section>
            <Section title="Device">
                <Row label="Device">{visitor.device}</Row>
                <Row label="Browser">{visitor.browser}</Row>
                <Row label="OS">{visitor.os}</Row>
            </Section>
            <Section title="Visit">
                <Row label="Page">
                    <PageLinkOrNull url={visitor.page} />
                </Row>
                <Row label="Referrer">
                    {visitor.referrer ? (
                        <PageLink url={visitor.referrer} />
                    ) : (
                        <span className="text-muted-foreground">
                            None (came directly)
                        </span>
                    )}
                </Row>
                <Row label="Visits">
                    {visitor.visitCount.toLocaleString("en-US")}
                </Row>
                <Row label="First seen">
                    {now ? formatDateTime(visitor.firstSeenAt) : " "}
                </Row>
                <Row label="Last seen">
                    {now ? formatDateTime(visitor.lastSeenAt) : " "}
                </Row>
            </Section>
            <Section title="Conversation">
                <Row label="Started">
                    {now ? formatDateTime(conversation.createdAt) : " "}
                </Row>
                {conversation.handoffReason ? (
                    <Row label="Handoff">
                        {HANDOFF_REASON_LABEL[conversation.handoffReason]}
                    </Row>
                ) : null}
                {conversation.closedAt ? (
                    <Row label="Closed">
                        {now ? formatDateTime(conversation.closedAt) : " "}
                    </Row>
                ) : null}
            </Section>
        </div>
    );
}

function PageLinkOrNull({ url }: { url: string | null }) {
    return url ? (
        <PageLink url={url} />
    ) : (
        <span className="text-muted-foreground">Unknown</span>
    );
}
