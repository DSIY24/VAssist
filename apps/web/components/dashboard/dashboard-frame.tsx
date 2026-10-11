import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { NavUserProps } from "./nav-user";
import { SiteHeader } from "./site-header";

export const DASHBOARD_FRAME_STYLE = {
    "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

/** The sidebar, the header and the content area, with no data access. */
export function DashboardFrame({
    user,
    defaultOpen = true,
    children,
}: {
    user: NavUserProps;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider
            defaultOpen={defaultOpen}
            style={DASHBOARD_FRAME_STYLE}
        >
            <AppSidebar variant="inset" user={user} />
            {/* `min-w-0` lets a page with fixed-width panes (the inbox) shrink
                to the space beside the sidebar instead of pushing past it. */}
            <SidebarInset className="min-w-0">
                <SiteHeader />
                <div className="flex min-w-0 flex-1 flex-col">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
