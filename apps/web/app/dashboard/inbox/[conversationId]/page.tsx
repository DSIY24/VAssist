import { Suspense } from "react";
import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import {
    ConversationSkeleton,
    ConversationView,
} from "@/components/inbox/conversation-view";
import {
    dehydrateSettled,
    prefetchConversation,
} from "@/components/inbox/prefetch";

// Static on purpose: a title per conversation would have to read `params`,
// which defers the whole page's metadata to request time.
export const metadata: Metadata = { title: "Inbox" };

// `params` is only known at request time, so it is read inside `<Suspense>`.
export default function ConversationPage({
    params,
}: PageProps<"/dashboard/inbox/[conversationId]">) {
    return (
        <Suspense fallback={<ConversationSkeleton />}>
            <ConversationLoader params={params} />
        </Suspense>
    );
}

async function ConversationLoader({
    params,
}: {
    params: Promise<{ conversationId: string }>;
}) {
    const { conversationId } = await params;
    const queryClient = await prefetchConversation(conversationId);
    return (
        <HydrationBoundary state={dehydrateSettled(queryClient)}>
            {/* Keyed, so a draft never follows the owner to another
                conversation. */}
            <ConversationView key={conversationId} id={conversationId} />
        </HydrationBoundary>
    );
}
