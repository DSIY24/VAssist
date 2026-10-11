import type { Metadata } from "next";
import { InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
    return (
        <EmptyState
            icon={InboxIcon}
            title="No conversations yet"
            description="Conversations with visitors will appear here."
        />
    );
}
