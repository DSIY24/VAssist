import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { ConversationListSkeleton } from "@/components/inbox/conversation-list";
import { InboxShell } from "@/components/inbox/inbox-shell";
import { dehydrateSettled, prefetchInbox } from "@/components/inbox/prefetch";

// Stays synchronous: the list is fetched in `InboxLoader`, and the skeleton is
// what gets prerendered.
export default function InboxLayout({
    children,
}: LayoutProps<"/dashboard/inbox">) {
    return (
        <Suspense fallback={<InboxSkeleton />}>
            <InboxLoader>{children}</InboxLoader>
        </Suspense>
    );
}

async function InboxLoader({ children }: { children: React.ReactNode }) {
    const queryClient = await prefetchInbox();
    return (
        <HydrationBoundary state={dehydrateSettled(queryClient)}>
            <InboxShell>{children}</InboxShell>
        </HydrationBoundary>
    );
}

function InboxSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="flex h-[calc(100svh-var(--header-height))] md:h-[calc(100svh-var(--header-height)-1rem)]"
        >
            <span className="sr-only">Loading conversations</span>
            <div className="w-full border-r md:w-80">
                <ConversationListSkeleton />
            </div>
        </div>
    );
}
