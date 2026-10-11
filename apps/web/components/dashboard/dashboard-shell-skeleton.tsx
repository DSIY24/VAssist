import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_FRAME_STYLE } from "./dashboard-frame";

/**
 * A static frame of the shell, shown while the session resolves. It is part
 * of the prerendered page, so it uses fixed widths: `SidebarMenuSkeleton`
 * calls `Math.random()`, which a prerender rejects.
 */
export function DashboardShellSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            style={DASHBOARD_FRAME_STYLE}
            className="flex min-h-svh w-full md:bg-sidebar"
        >
            <span className="sr-only">Loading dashboard</span>
            <div
                aria-hidden="true"
                className="hidden w-64 shrink-0 flex-col p-2 md:flex"
            >
                <div className="flex h-12 items-center gap-2 px-3.5">
                    <Skeleton className="size-5 bg-foreground/10" />
                    <Skeleton className="h-4 w-20 bg-foreground/10" />
                </div>
                <div className="flex flex-col gap-1 p-2">
                    <div className="flex h-8 items-center gap-2 px-2">
                        <Skeleton className="size-4 bg-foreground/10" />
                        <Skeleton className="h-4 w-24 bg-foreground/10" />
                    </div>
                    <div className="flex h-8 items-center gap-2 px-2">
                        <Skeleton className="size-4 bg-foreground/10" />
                        <Skeleton className="h-4 w-16 bg-foreground/10" />
                    </div>
                </div>
                <div className="mt-auto flex h-16 items-center gap-2 px-4">
                    <Skeleton className="size-8 rounded-full bg-foreground/10" />
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-28 bg-foreground/10" />
                        <Skeleton className="h-3 w-36 bg-foreground/10" />
                    </div>
                </div>
            </div>
            <div
                aria-hidden="true"
                className="flex flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-xl md:shadow-sm"
            >
                <div className="flex h-(--header-height) shrink-0 items-center gap-3 border-b px-4 lg:px-6">
                    <Skeleton className="size-5 bg-foreground/10" />
                    <Skeleton className="h-4 w-24 bg-foreground/10" />
                    <Skeleton className="ml-auto size-8 bg-foreground/10" />
                </div>
            </div>
        </div>
    );
}
