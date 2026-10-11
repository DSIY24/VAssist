"use client";

import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DASHBOARD_NAV, isNavItemActive } from "./nav";

export function SiteHeader() {
    const pathname = usePathname();
    const title =
        DASHBOARD_NAV.find((item) => isNavItemActive(item, pathname))?.title ??
        "Dashboard";

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 h-4 data-vertical:self-auto"
                />
                <h1 className="text-base font-medium">{title}</h1>
                <ModeToggle className="ml-auto" />
            </div>
        </header>
    );
}
