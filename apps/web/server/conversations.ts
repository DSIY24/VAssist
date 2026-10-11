import "server-only";
import {
    closeConversation as closeConversationInDb,
    countConversationsByState,
    getAgentName,
    getConversation as getConversationFromDb,
    getMemberId,
    handBackConversation as handBackConversationInDb,
    listConversations as listConversationsFromDb,
    listMessages,
    replyToConversation as replyToConversationInDb,
    takeOverConversation as takeOverConversationInDb,
    type ConversationChange,
} from "@vassist/db";
import { ownerProcedure } from "./orpc";

/** What the owner is shown as when their account has no name. */
function ownerName(user: { name: string; email: string }) {
    return user.name.trim() || user.email;
}

export const listConversations = ownerProcedure.conversations.list.handler(
    async ({ context, input }) =>
        listConversationsFromDb({
            workspaceId: context.workspaceId,
            filter: input.filter,
            cursor: input.cursor,
        }),
);

export const countConversations = ownerProcedure.conversations.counts.handler(
    async ({ context }) =>
        countConversationsByState({ workspaceId: context.workspaceId }),
);

export const getConversation = ownerProcedure.conversations.get.handler(
    async ({ context, input, errors }) => {
        const [conversation, agentName] = await Promise.all([
            getConversationFromDb({
                workspaceId: context.workspaceId,
                id: input.id,
            }),
            getAgentName({ workspaceId: context.workspaceId }),
        ]);
        if (!conversation) throw errors.NOT_FOUND();
        return {
            ...conversation,
            agentName,
            owner: {
                name: ownerName(context.user),
                image: context.user.image,
            },
        };
    },
);

export const listConversationMessages =
    ownerProcedure.conversations.messages.handler(
        async ({ context, input, errors }) => {
            const messages = await listMessages({
                workspaceId: context.workspaceId,
                conversationId: input.id,
            });
            if (!messages) throw errors.NOT_FOUND();
            return messages;
        },
    );

type ChangeErrors = {
    NOT_FOUND: () => Error;
    CONFLICT: (options: {
        data: { state: "ai" | "waiting" | "human" | "closed" };
    }) => Error;
};

/** Turns the data layer's outcome into the procedure's answer or its error. */
function settle(id: string, change: ConversationChange, errors: ChangeErrors) {
    if (!change.ok) {
        throw change.reason === "not_found"
            ? errors.NOT_FOUND()
            : errors.CONFLICT({ data: { state: change.state } });
    }
    return {
        id,
        state: change.state,
        lastMessageAt: change.lastMessageAt,
        closedAt: change.closedAt,
        messages: change.messages,
    };
}

export const replyToConversation = ownerProcedure.conversations.reply.handler(
    async ({ context, input, errors }) => {
        const memberId = await getMemberId({
            workspaceId: context.workspaceId,
            userId: context.user.id,
        });
        if (!memberId) throw errors.FORBIDDEN();
        const change = settle(
            input.id,
            await replyToConversationInDb({
                workspaceId: context.workspaceId,
                conversationId: input.id,
                memberId,
                memberName: context.user.name,
                body: input.body,
            }),
            errors,
        );
        // REAL-TIME PUBLISH GOES HERE (persist, then publish): the new
        // messages and the state change, to the conversation and workspace
        // rooms.
        return change;
    },
);

export const takeOverConversation =
    ownerProcedure.conversations.takeOver.handler(
        async ({ context, input, errors }) => {
            const change = settle(
                input.id,
                await takeOverConversationInDb({
                    workspaceId: context.workspaceId,
                    conversationId: input.id,
                    memberName: context.user.name,
                }),
                errors,
            );
            // REAL-TIME PUBLISH GOES HERE (persist, then publish).
            return change;
        },
    );

export const handBackConversation =
    ownerProcedure.conversations.handBack.handler(
        async ({ context, input, errors }) => {
            const change = settle(
                input.id,
                await handBackConversationInDb({
                    workspaceId: context.workspaceId,
                    conversationId: input.id,
                }),
                errors,
            );
            // REAL-TIME PUBLISH GOES HERE (persist, then publish).
            return change;
        },
    );

export const closeConversation = ownerProcedure.conversations.close.handler(
    async ({ context, input, errors }) => {
        const change = settle(
            input.id,
            await closeConversationInDb({
                workspaceId: context.workspaceId,
                conversationId: input.id,
            }),
            errors,
        );
        // REAL-TIME PUBLISH GOES HERE (persist, then publish).
        return change;
    },
);

export const conversationsRouter = {
    list: listConversations,
    counts: countConversations,
    get: getConversation,
    messages: listConversationMessages,
    reply: replyToConversation,
    takeOver: takeOverConversation,
    handBack: handBackConversation,
    close: closeConversation,
};
