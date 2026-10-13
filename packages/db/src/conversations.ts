// Visitors, conversations and messages. Every function takes `workspaceId`.

import { getDb } from "./client";
import { CLOSED_NOTICE, HAND_BACK_NOTICE, joinedNotice } from "./notices";

export type ConversationState = "ai" | "waiting" | "human" | "closed";

export type HandoffReason =
    | "low_confidence"
    | "no_relevant_knowledge"
    | "visitor_requested"
    | "agent_off";

export type MessageAuthor = "visitor" | "agent" | "member" | "system";

export type MessageNotice =
    "greeting" | "handoff" | "take_over" | "hand_back" | "closed";

export type MessageClassification =
    "support_question" | "small_talk" | "off_topic" | "human_request";

/** What the inbox list can be narrowed to. `open` is every state but `closed`. */
export type ConversationFilter = "open" | ConversationState;

export type ConversationPreview = {
    author: Exclude<MessageAuthor, "system">;
    body: string;
};

export type ConversationSummary = {
    id: string;
    state: ConversationState;
    handoffReason: HandoffReason | null;
    lastMessageAt: string;
    createdAt: string;
    visitor: { id: string; city: string | null; country: string | null };
    /** The newest message somebody wrote, if there is one. Never a notice. */
    lastMessage: ConversationPreview | null;
};

export type VisitorDetails = {
    id: string;
    country: string | null;
    city: string | null;
    timezone: string | null;
    language: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    page: string | null;
    referrer: string | null;
    visitCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
};

export type ConversationDetail = {
    id: string;
    state: ConversationState;
    handoffReason: HandoffReason | null;
    lastMessageAt: string;
    createdAt: string;
    closedAt: string | null;
    visitor: VisitorDetails;
};

export type ConversationMessage = {
    id: string;
    conversationId: string;
    author: MessageAuthor;
    memberId: string | null;
    notice: MessageNotice | null;
    body: string;
    classification: MessageClassification | null;
    declined: boolean;
    createdAt: string;
};

export type ConversationCounts = Record<ConversationState, number>;

/**
 * The outcome of a state change. `wrong_state` means the conversation exists
 * but was not in a state the change starts from: nothing was written, and
 * `state` is what it is now.
 */
export type ConversationChange =
    | {
          ok: true;
          state: ConversationState;
          lastMessageAt: string;
          closedAt: string | null;
          /** The messages this change wrote, oldest first. */
          messages: ConversationMessage[];
      }
    | { ok: false; reason: "not_found" }
    | { ok: false; reason: "wrong_state"; state: ConversationState };

const MESSAGE_FIELDS = [
    "id",
    "conversationId",
    "author",
    "memberId",
    "notice",
    "body",
    "classification",
    "declined",
    "createdAt",
] as const;

const DEFAULT_PAGE_SIZE = 30;

/**
 * Timestamps come back in Postgres's text form (`2026-10-11 15:35:27.097+00`),
 * which browsers do not all parse. Everything this module returns is ISO 8601.
 */
function toIso(timestamp: string): string {
    const parsed = new Date(
        timestamp.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"),
    );
    return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toISOString();
}

function toMessage(row: ConversationMessage): ConversationMessage {
    return {
        id: row.id,
        conversationId: row.conversationId,
        author: row.author,
        memberId: row.memberId,
        notice: row.notice,
        body: row.body,
        classification: row.classification,
        declined: row.declined,
        createdAt: toIso(row.createdAt),
    };
}

type ListCursor = { waiting: boolean; at: string; id: string };

function encodeCursor(cursor: ListCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
// `timestamptz::text`, which keeps the microseconds a keyset needs.
const PG_TIMESTAMP = /^\d{4}-\d{2}-\d{2} [\d:.]{8,15}[+-][\d:]{2,8}$/;

/** `null` for anything that is not a cursor this module produced. */
function decodeCursor(value: string): ListCursor | null {
    try {
        const parsed: unknown = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8"),
        );
        if (typeof parsed !== "object" || parsed === null) return null;
        const { waiting, at, id } = parsed as Record<string, unknown>;
        if (
            typeof waiting !== "boolean" ||
            typeof at !== "string" ||
            !PG_TIMESTAMP.test(at) ||
            typeof id !== "string" ||
            !UUID.test(id)
        ) {
            return null;
        }
        return { waiting, at, id };
    } catch {
        return null;
    }
}

type ListRow = {
    id: string;
    state: ConversationState;
    handoff_reason: HandoffReason | null;
    last_message_at: string;
    created_at: string;
    cursor_at: string;
    visitor_id: string;
    visitor_city: string | null;
    visitor_country: string | null;
    preview_author: ConversationPreview["author"] | null;
    preview_body: string | null;
};

/**
 * One page of the inbox list: `waiting` conversations first, then the newest
 * message first. `nextCursor` is `null` on the last page.
 *
 * Written as SQL because the order leads with an expression and each row
 * carries its newest message, neither of which the ORM expresses.
 */
export async function listConversations({
    workspaceId,
    filter = "open",
    cursor,
    limit = DEFAULT_PAGE_SIZE,
}: {
    workspaceId: string;
    filter?: ConversationFilter;
    cursor?: string | null;
    limit?: number;
}): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
    const db = getDb();
    const after = cursor ? decodeCursor(cursor) : null;
    const pageSize = Math.min(Math.max(Math.trunc(limit), 1), 100);
    // Placeholders for the first page. `hasCursor` keeps them out of the
    // comparison.
    const hasCursor = after !== null;
    const afterWaiting = after?.waiting ? 1 : 0;
    const afterAt = after?.at ?? "epoch";
    const afterId = after?.id ?? "00000000-0000-0000-0000-000000000000";

    const plan = db.raw.sql`
        select
            c.id,
            c.state,
            c.handoff_reason,
            c.last_message_at,
            c.created_at,
            c.last_message_at::text as cursor_at,
            v.id as visitor_id,
            v.city as visitor_city,
            v.country as visitor_country,
            m.author as preview_author,
            m.body as preview_body
        from conversations c
        join visitors v
            on v.id = c.visitor_id and v.workspace_id = c.workspace_id
        left join lateral (
            select author, left(body, 280) as body
            from messages
            where conversation_id = c.id
                and workspace_id = c.workspace_id
                and author <> 'system'
            order by created_at desc, id desc
            limit 1
        ) m on true
        where c.workspace_id = ${workspaceId}::uuid
            and (
                (${filter} = 'open' and c.state <> 'closed')
                or c.state = ${filter}
            )
            and (
                not ${hasCursor}
                or ((c.state = 'waiting')::int, c.last_message_at, c.id)
                    < (${afterWaiting}::int, ${afterAt}::timestamptz, ${afterId}::uuid)
            )
        order by (c.state = 'waiting') desc, c.last_message_at desc, c.id desc
        limit ${pageSize + 1}`
        .returnsRow({
            id: "pg/uuid@1",
            state: "pg/text@1",
            handoff_reason: { codecId: "pg/text@1", nullable: true },
            last_message_at: "pg/timestamptz-string@1",
            created_at: "pg/timestamptz-string@1",
            cursor_at: "pg/text@1",
            visitor_id: "pg/uuid@1",
            visitor_city: { codecId: "pg/text@1", nullable: true },
            visitor_country: { codecId: "pg/text@1", nullable: true },
            preview_author: { codecId: "pg/text@1", nullable: true },
            preview_body: { codecId: "pg/text@1", nullable: true },
        })
        .build();
    const rows = (await db.runtime().query(plan)) as unknown as ListRow[];

    const page = rows.slice(0, pageSize);
    const last = page.at(-1);
    return {
        items: page.map((row) => ({
            id: row.id,
            state: row.state,
            handoffReason: row.handoff_reason,
            lastMessageAt: toIso(row.last_message_at),
            createdAt: toIso(row.created_at),
            visitor: {
                id: row.visitor_id,
                city: row.visitor_city,
                country: row.visitor_country,
            },
            lastMessage:
                row.preview_author !== null && row.preview_body !== null
                    ? { author: row.preview_author, body: row.preview_body }
                    : null,
        })),
        nextCursor:
            rows.length > pageSize && last
                ? encodeCursor({
                      waiting: last.state === "waiting",
                      at: last.cursor_at,
                      id: last.id,
                  })
                : null,
    };
}

/** How many conversations the workspace has in each state. */
export async function countConversationsByState({
    workspaceId,
}: {
    workspaceId: string;
}): Promise<ConversationCounts> {
    const groups = await getDb()
        .orm.public.Conversation.where({ workspaceId })
        .groupBy("state")
        .aggregate((a) => ({ total: a.count() }));
    const counts: ConversationCounts = {
        ai: 0,
        waiting: 0,
        human: 0,
        closed: 0,
    };
    for (const group of groups) counts[group.state] = group.total;
    return counts;
}

/** One conversation with its visitor details, or `null`. */
export async function getConversation({
    workspaceId,
    id,
}: {
    workspaceId: string;
    id: string;
}): Promise<ConversationDetail | null> {
    const conversation = await getDb()
        .orm.public.Conversation.where({ id, workspaceId })
        .select(
            "id",
            "state",
            "handoffReason",
            "lastMessageAt",
            "createdAt",
            "closedAt",
        )
        .include("visitor", (visitor) =>
            visitor.select(
                "id",
                "country",
                "city",
                "timezone",
                "language",
                "device",
                "browser",
                "os",
                "page",
                "referrer",
                "visitCount",
                "firstSeenAt",
                "lastSeenAt",
            ),
        )
        .first();
    // `visitor_id` is NOT NULL with a foreign key; the relation is only typed
    // as nullable.
    if (!conversation?.visitor) return null;
    const { visitor } = conversation;
    return {
        id: conversation.id,
        state: conversation.state,
        handoffReason: conversation.handoffReason,
        lastMessageAt: toIso(conversation.lastMessageAt),
        createdAt: toIso(conversation.createdAt),
        closedAt: conversation.closedAt && toIso(conversation.closedAt),
        visitor: {
            ...visitor,
            firstSeenAt: toIso(visitor.firstSeenAt),
            lastSeenAt: toIso(visitor.lastSeenAt),
        },
    };
}

/**
 * A conversation's whole history, oldest first, or `null` when the workspace
 * has no such conversation.
 */
export async function listMessages({
    workspaceId,
    conversationId,
}: {
    workspaceId: string;
    conversationId: string;
}): Promise<ConversationMessage[] | null> {
    const db = getDb();
    const conversation = await db.orm.public.Conversation.where({
        id: conversationId,
        workspaceId,
    })
        .select("id")
        .first();
    if (!conversation) return null;
    const rows = await db.orm.public.Message.where({
        conversationId,
        workspaceId,
    })
        .select(...MESSAGE_FIELDS)
        .orderBy([
            (message) => message.createdAt.asc(),
            (message) => message.id.asc(),
        ])
        .all();
    return rows.map(toMessage);
}

/**
 * The name agent messages are shown under: the one the owner set, or
 * "{Workspace name} Agent".
 */
export async function getAgentName({
    workspaceId,
}: {
    workspaceId: string;
}): Promise<string> {
    const workspace = await getDb()
        .orm.public.Workspace.where({ id: workspaceId })
        .select("name", "agentName")
        .first();
    return (
        workspace?.agentName?.trim() || `${workspace?.name ?? ""} Agent`.trim()
    );
}

/** The member row of a signed-in person in this workspace, or `null`. */
export async function getMemberId({
    workspaceId,
    userId,
}: {
    workspaceId: string;
    userId: string;
}): Promise<string | null> {
    const member = await getDb()
        .orm.public.Member.where({ workspaceId, userId })
        .select("id")
        .first();
    return member?.id ?? null;
}

type NewMessage = {
    author: MessageAuthor;
    memberId?: string;
    notice?: MessageNotice;
    body: string;
};

/**
 * Runs one state change under a row lock, so two changes to the same
 * conversation never interleave. `decide` sees the locked state and returns
 * what to write, or `null` when the change does not start from that state.
 */
async function changeConversation({
    workspaceId,
    conversationId,
    decide,
}: {
    workspaceId: string;
    conversationId: string;
    decide: (state: ConversationState) => {
        state: ConversationState;
        messages: NewMessage[];
    } | null;
}): Promise<ConversationChange> {
    const db = getDb();
    return await db.transaction(async (tx) => {
        // `FOR NO KEY UPDATE` blocks other writers of this row without
        // blocking the foreign-key check of a message being inserted.
        const current = await tx.orm.public.Conversation.where({
            id: conversationId,
            workspaceId,
        })
            .select("id", "state", "lastMessageAt", "closedAt")
            .forNoKeyUpdate()
            .first();
        if (!current) return { ok: false, reason: "not_found" } as const;
        const next = decide(current.state);
        if (!next) {
            return {
                ok: false,
                reason: "wrong_state",
                state: current.state,
            } as const;
        }

        // Read the clock only once the lock is held, so `last_message_at`
        // never moves backwards. Messages written together are a millisecond
        // apart, which keeps their order in the history.
        const startedAt = Math.max(
            Date.now(),
            Date.parse(toIso(current.lastMessageAt)) + 1,
        );
        const messages: ConversationMessage[] = [];
        for (const [index, message] of next.messages.entries()) {
            const created = await tx.orm.public.Message.create({
                workspaceId,
                conversationId,
                author: message.author,
                memberId: message.memberId ?? null,
                notice: message.notice ?? null,
                body: message.body,
                createdAt: new Date(startedAt + index).toISOString(),
            });
            messages.push(toMessage(created));
        }

        const lastMessageAt =
            messages.at(-1)?.createdAt ?? toIso(current.lastMessageAt);
        const closedAt =
            next.state === "closed"
                ? new Date(startedAt + next.messages.length).toISOString()
                : null;
        await tx.orm.public.Conversation.where({
            id: conversationId,
            workspaceId,
        }).updateAndCount({ state: next.state, lastMessageAt, closedAt });
        return {
            ok: true,
            state: next.state,
            lastMessageAt,
            closedAt,
            messages,
        } as const;
    });
}

function takeOverNotice(memberName: string | null): NewMessage {
    return {
        author: "system",
        notice: "take_over",
        body: joinedNotice(memberName),
    };
}

/**
 * Saves the owner's reply. Sending a reply is taking over: from `ai` or
 * `waiting` the conversation becomes `human` in the same transaction, so the
 * owner and the agent never reply at the same time (PRD Flow C).
 */
export async function replyToConversation({
    workspaceId,
    conversationId,
    memberId,
    memberName,
    body,
}: {
    workspaceId: string;
    conversationId: string;
    memberId: string;
    memberName: string | null;
    body: string;
}): Promise<ConversationChange> {
    return changeConversation({
        workspaceId,
        conversationId,
        decide: (state) => {
            if (state === "closed") return null;
            const reply: NewMessage = { author: "member", memberId, body };
            return {
                state: "human",
                messages:
                    state === "human"
                        ? [reply]
                        : [takeOverNotice(memberName), reply],
            };
        },
    });
}

/** Take over: `ai` or `waiting` becomes `human`. */
export async function takeOverConversation({
    workspaceId,
    conversationId,
    memberName,
}: {
    workspaceId: string;
    conversationId: string;
    memberName: string | null;
}): Promise<ConversationChange> {
    return changeConversation({
        workspaceId,
        conversationId,
        decide: (state) =>
            state === "ai" || state === "waiting"
                ? { state: "human", messages: [takeOverNotice(memberName)] }
                : null,
    });
}

/** Hand back: `human` becomes `ai`, and the visitor is told. */
export async function handBackConversation({
    workspaceId,
    conversationId,
}: {
    workspaceId: string;
    conversationId: string;
}): Promise<ConversationChange> {
    return changeConversation({
        workspaceId,
        conversationId,
        decide: (state) =>
            state === "human"
                ? {
                      state: "ai",
                      messages: [
                          {
                              author: "system",
                              notice: "hand_back",
                              body: HAND_BACK_NOTICE,
                          },
                      ],
                  }
                : null,
    });
}

/** Close: any open state becomes `closed`, and the visitor is told. */
export async function closeConversation({
    workspaceId,
    conversationId,
}: {
    workspaceId: string;
    conversationId: string;
}): Promise<ConversationChange> {
    return changeConversation({
        workspaceId,
        conversationId,
        decide: (state) =>
            state === "closed"
                ? null
                : {
                      state: "closed",
                      messages: [
                          {
                              author: "system",
                              notice: "closed",
                              body: CLOSED_NOTICE,
                          },
                      ],
                  },
    });
}
