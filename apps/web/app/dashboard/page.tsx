import type { Metadata } from "next";
import { LayoutDashboardIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
    return (
        <EmptyState
            icon={LayoutDashboardIcon}
            title="Nothing to show yet"
            description="Activity from your workspace will appear here."
        />
    );
}
