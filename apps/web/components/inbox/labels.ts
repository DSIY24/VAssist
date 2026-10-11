import type {
    ConversationFilter,
    ConversationState,
    HandoffReason,
    MessageAuthor,
} from "@vassist/shared";

/** A state as the owner reads it: who replies. */
export const STATE_LABEL: Record<ConversationState, string> = {
    waiting: "Waiting",
    ai: "Agent",
    human: "You",
    closed: "Closed",
};

export const FILTERS: readonly { value: ConversationFilter; label: string }[] =
    [
        { value: "open", label: "All open" },
        { value: "waiting", label: "Waiting" },
        { value: "ai", label: "Agent" },
        { value: "human", label: "You" },
        { value: "closed", label: "Closed" },
    ];

export const HANDOFF_REASON_LABEL: Record<HandoffReason, string> = {
    low_confidence: "The agent wasn't sure of the answer",
    no_relevant_knowledge: "Nothing in the knowledge base covered it",
    visitor_requested: "The visitor asked for a person",
    agent_off: "The agent is off",
};

/** Visitors are anonymous, so they are named by where they are. */
export function visitorLabel(visitor: {
    city: string | null;
    country: string | null;
}) {
    const place = [visitor.city, visitor.country].filter(Boolean).join(", ");
    return place ? `Visitor from ${place}` : "Visitor";
}

/** Who wrote a list preview, as a short prefix. Empty for the visitor. */
export function previewPrefix(author: Exclude<MessageAuthor, "system">) {
    if (author === "agent") return "Agent: ";
    if (author === "member") return "You: ";
    return "";
}

/** Markdown reduced to one plain line, for a list preview. */
export function plainPreview(body: string) {
    return body
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
        .replace(/[*_~`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "5m", "3h", "2d", then a short date. */
export function shortRelativeTime(iso: string, now: number) {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return "";
    const elapsed = Math.max(0, now - then);
    if (elapsed < MINUTE) return "now";
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
    if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
    }).format(then);
}

const timeFormat = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
});

export function formatTime(iso: string) {
    return timeFormat.format(new Date(iso));
}

export function formatDateTime(iso: string) {
    return dateTimeFormat.format(new Date(iso));
}

/** "Today", "Yesterday", or the full day, in the owner's timezone. */
export function formatDay(iso: string, now: number) {
    const date = new Date(iso);
    const startOfDay = (value: Date | number) => {
        const day = new Date(value);
        day.setHours(0, 0, 0, 0);
        return day.getTime();
    };
    const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return dayFormat.format(date);
}

/** The local calendar day of a timestamp, to tell when the day changes. */
export function dayKey(iso: string) {
    const date = new Date(iso);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** The time where the visitor is, or `null` for an unknown timezone. */
export function localTimeIn(timezone: string | null, now: number) {
    if (!timezone) return null;
    try {
        return new Intl.DateTimeFormat("en", {
            hour: "numeric",
            minute: "2-digit",
            weekday: "short",
            timeZone: timezone,
        }).format(now);
    } catch {
        return null;
    }
}

/** "en-GB" as "English (United Kingdom)". Falls back to the tag itself. */
export function languageName(tag: string | null) {
    if (!tag) return null;
    try {
        return new Intl.DisplayNames("en", { type: "language" }).of(tag) ?? tag;
    } catch {
        return tag;
    }
}
