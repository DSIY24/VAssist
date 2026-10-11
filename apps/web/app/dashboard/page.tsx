import type { Metadata } from "next";
import { HouseIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
    return (
        <EmptyState
            icon={HouseIcon}
            title="Nothing to show yet"
            description="Activity from your workspace will appear here."
        />
    );
}
