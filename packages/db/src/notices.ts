// The fixed text of system messages. No imports, so scripts run by Node
// directly can share it.

/** What the widget shows when the owner hands a conversation back (PRD Flow C). */
export const HAND_BACK_NOTICE = "You're now chatting with the AI agent.";

/** What the widget shows once a conversation is closed (PRD Flow C). */
export const CLOSED_NOTICE =
    "This conversation has ended. Send a message to start a new one.";

/**
 * What the widget shows when the owner takes over. Their name when the
 * account has one, and never their email: visitors read this.
 */
export function joinedNotice(memberName: string | null) {
    const name = memberName?.trim();
    return `${name || "A person"} joined the conversation.`;
}
