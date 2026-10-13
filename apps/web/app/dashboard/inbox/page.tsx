import type { Metadata } from "next";
import { MessagesSquareIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Inbox" };

// Shown beside the list while no conversation is open. Below `md` the list
// has the whole screen and this is hidden.
export default function InboxPage() {
    return (
        <EmptyState
            icon={MessagesSquareIcon}
            title="Select a conversation"
            description="Pick one from the list to read it and reply."
        />
    );
}
