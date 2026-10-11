"use client";

import * as React from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser, type NavUserProps } from "./nav-user";

export function AppSidebar({
    user,
    ...props
}: React.ComponentProps<typeof Sidebar> & { user: NavUserProps }) {
    const { setOpenMobile } = useSidebar();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="VAssist"
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                            render={
                                <Link
                                    href="/dashboard"
                                    onClick={() => setOpenMobile(false)}
                                />
                            }
                        >
                            <BrandMark className="size-5!" />
                            <span className="text-base font-semibold">
                                VAssist
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}
