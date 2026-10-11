"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { DASHBOARD_NAV, isNavItemActive } from "./nav";

export function NavMain() {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                    {DASHBOARD_NAV.map((item) => {
                        const isActive = isNavItemActive(item, pathname);
                        return (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={isActive}
                                    render={
                                        <Link
                                            href={item.href}
                                            aria-current={
                                                pathname === item.href
                                                    ? "page"
                                                    : isActive || undefined
                                            }
                                            onClick={() => setOpenMobile(false)}
                                        />
                                    }
                                >
                                    <item.icon />
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
