import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardShellSkeleton } from "@/components/dashboard/dashboard-shell-skeleton";

// Stays synchronous: the session read happens in `DashboardShell`, and the
// skeleton is what gets prerendered.
export default function DashboardLayout({
    children,
}: LayoutProps<"/dashboard">) {
    return (
        <Suspense fallback={<DashboardShellSkeleton />}>
            <DashboardShell>{children}</DashboardShell>
        </Suspense>
    );
}
