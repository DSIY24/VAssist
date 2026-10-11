import { InboxIcon, LayoutDashboardIcon, type LucideIcon } from "lucide-react";

export type DashboardNavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    /** Active on this exact path only, instead of on everything below it. */
    exact?: boolean;
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
    {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
        exact: true,
    },
    { title: "Inbox", href: "/dashboard/inbox", icon: InboxIcon },
];

export function isNavItemActive(item: DashboardNavItem, pathname: string) {
    return item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
