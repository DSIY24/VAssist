// Conversations and messages: the inbox's schemas and procedures.

import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";

export const conversationStateSchema = z
    .enum(["ai", "waiting", "human", "closed"])
    .meta({ id: "ConversationState" });
export type ConversationState = z.infer<typeof conversationStateSchema>;

/** The states in which someone still replies. */
export const OPEN_CONVERSATION_STATES = [
    "ai",
    "waiting",
    "human",
] as const satisfies readonly ConversationState[];

export const handoffReasonSchema = z
    .enum([
        "low_confidence",
        "no_relevant_knowledge",
        "visitor_requested",
        "agent_off",
    ])
    .meta({ id: "HandoffReason" });
export type HandoffReason = z.infer<typeof handoffReasonSchema>;

/** What the inbox list can be narrowed to. `open` is every state but `closed`. */
export const conversationFilterSchema = z.enum([
    "open",
    "waiting",
    "ai",
    "human",
    "closed",
]);
export type ConversationFilter = z.infer<typeof conversationFilterSchema>;

export const messageAuthorSchema = z.enum([
    "visitor",
    "agent",
    "member",
    "system",
]);
export type MessageAuthor = z.infer<typeof messageAuthorSchema>;

export const messageNoticeSchema = z.enum([
    "greeting",
    "handoff",
    "take_over",
    "hand_back",
    "closed",
]);
export type MessageNotice = z.infer<typeof messageNoticeSchema>;

export const messageClassificationSchema = z.enum([
    "support_question",
    "small_talk",
    "off_topic",
    "human_request",
]);

/** The longest chat message anyone can send (PRD L-3). */
export const MESSAGE_MAX_LENGTH = 4000;

export const messageBodySchema = z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(
        MESSAGE_MAX_LENGTH,
        `Use ${MESSAGE_MAX_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    );

export const messageSchema = z
    .object({
        id: z.uuid(),
        conversationId: z.uuid(),
        author: messageAuthorSchema,
        /** What a system message announces. Null on every other message. */
        notice: messageNoticeSchema.nullable(),
        body: z.string(),
        classification: messageClassificationSchema.nullable(),
        /** True on a visitor message the agent refused as off-topic. */
        declined: z.boolean(),
        createdAt: z.string(),
    })
    .meta({ id: "Message" });
export type Message = z.infer<typeof messageSchema>;

export const conversationSummarySchema = z
    .object({
        id: z.uuid(),
        state: conversationStateSchema,
        handoffReason: handoffReasonSchema.nullable(),
        lastMessageAt: z.string(),
        createdAt: z.string(),
        visitor: z.object({
            id: z.uuid(),
            city: z.string().nullable(),
            country: z.string().nullable(),
        }),
        /** The newest message somebody wrote. Never a system message. */
        lastMessage: z
            .object({
                author: messageAuthorSchema.exclude(["system"]),
                body: z.string(),
            })
            .nullable(),
    })
    .meta({ id: "ConversationSummary" });
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const visitorDetailsSchema = z
    .object({
        id: z.uuid(),
        country: z.string().nullable(),
        city: z.string().nullable(),
        timezone: z.string().nullable(),
        language: z.string().nullable(),
        device: z.string().nullable(),
        browser: z.string().nullable(),
        os: z.string().nullable(),
        page: z.string().nullable(),
        referrer: z.string().nullable(),
        visitCount: z.number().int(),
        firstSeenAt: z.string(),
        lastSeenAt: z.string(),
    })
    .meta({ id: "VisitorDetails" });
export type VisitorDetails = z.infer<typeof visitorDetailsSchema>;

export const conversationSchema = z
    .object({
        id: z.uuid(),
        state: conversationStateSchema,
        handoffReason: handoffReasonSchema.nullable(),
        lastMessageAt: z.string(),
        createdAt: z.string(),
        closedAt: z.string().nullable(),
        visitor: visitorDetailsSchema,
        /** The name agent messages are shown under. */
        agentName: z.string(),
        /** Who member messages are shown as. v1 has one member, the owner. */
        owner: z.object({
            name: z.string(),
            image: z.string().nullable(),
        }),
    })
    .meta({ id: "Conversation" });
export type Conversation = z.infer<typeof conversationSchema>;

export const conversationCountsSchema = z
    .object({
        ai: z.number().int(),
        waiting: z.number().int(),
        human: z.number().int(),
        closed: z.number().int(),
    })
    .meta({ id: "ConversationCounts" });
export type ConversationCounts = z.infer<typeof conversationCountsSchema>;

/** What a write returns: where the conversation is now, and what was added. */
export const conversationChangeSchema = z
    .object({
        id: z.uuid(),
        state: conversationStateSchema,
        lastMessageAt: z.string(),
        closedAt: z.string().nullable(),
        /** The messages this change wrote, oldest first. */
        messages: z.array(messageSchema),
    })
    .meta({ id: "ConversationChange" });
export type ConversationChange = z.infer<typeof conversationChangeSchema>;

const conversationIdInput = z.object({ id: z.uuid() });

const NOT_FOUND = { message: "Conversation not found" };
// The conversation is no longer in a state this action starts from. `state` is
// where it is now.
const CONFLICT = {
    message: "The conversation changed",
    data: z.object({ state: conversationStateSchema }),
};

const tags = ["Conversations"];

const list = oc
    .meta(
        openapi({
            method: "GET",
            path: "/conversations",
            tags,
            summary: "List conversations",
            description:
                "Waiting conversations first, then the newest message first. Pass `nextCursor` back as `cursor` for the next page.",
        }),
    )
    .input(
        z.object({
            filter: conversationFilterSchema.optional(),
            cursor: z.string().max(400).optional(),
        }),
    )
    .output(
        z.object({
            items: z.array(conversationSummarySchema),
            nextCursor: z.string().nullable(),
        }),
    );

const counts = oc
    .meta(
        openapi({
            method: "GET",
            path: "/conversations/counts",
            tags,
            summary: "Count conversations by state",
        }),
    )
    .output(conversationCountsSchema);

const get = oc
    .meta(
        openapi({
            method: "GET",
            path: "/conversations/{id}",
            tags,
            summary: "Get a conversation and its visitor details",
        }),
    )
    .errors({ NOT_FOUND })
    .input(conversationIdInput)
    .output(conversationSchema);

const messages = oc
    .meta(
        openapi({
            method: "GET",
            path: "/conversations/{id}/messages",
            tags,
            summary: "List a conversation's messages, oldest first",
        }),
    )
    .errors({ NOT_FOUND })
    .input(conversationIdInput)
    .output(z.array(messageSchema));

const reply = oc
    .meta(
        openapi({
            method: "POST",
            path: "/conversations/{id}/messages",
            tags,
            summary: "Reply to a conversation",
            description:
                "Sending a reply is taking over: from `ai` or `waiting` the conversation becomes `human`. A closed conversation answers CONFLICT.",
        }),
    )
    .errors({ NOT_FOUND, CONFLICT })
    .input(z.object({ id: z.uuid(), body: messageBodySchema }))
    .output(conversationChangeSchema);

const takeOver = oc
    .meta(
        openapi({
            method: "POST",
            path: "/conversations/{id}/take-over",
            tags,
            summary: "Take over a conversation",
            description: "Moves `ai` or `waiting` to `human`.",
        }),
    )
    .errors({ NOT_FOUND, CONFLICT })
    .input(conversationIdInput)
    .output(conversationChangeSchema);

const handBack = oc
    .meta(
        openapi({
            method: "POST",
            path: "/conversations/{id}/hand-back",
            tags,
            summary: "Hand a conversation back to the agent",
            description: "Moves `human` to `ai`.",
        }),
    )
    .errors({ NOT_FOUND, CONFLICT })
    .input(conversationIdInput)
    .output(conversationChangeSchema);

const close = oc
    .meta(
        openapi({
            method: "POST",
            path: "/conversations/{id}/close",
            tags,
            summary: "Close a conversation",
            description: "Moves any open state to `closed`.",
        }),
    )
    .errors({ NOT_FOUND, CONFLICT })
    .input(conversationIdInput)
    .output(conversationChangeSchema);

export const conversationsContract = {
    list,
    counts,
    get,
    messages,
    reply,
    takeOver,
    handBack,
    close,
};
