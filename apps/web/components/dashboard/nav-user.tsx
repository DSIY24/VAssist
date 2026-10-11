"use client";

import * as React from "react";
import { EllipsisVerticalIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";
import { callAuth } from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";

export type NavUserProps = {
    name: string;
    email: string;
    image: string | null;
};

/** First letters of the first and last word of the name, else of the email. */
export function getInitials(name: string, email: string) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const first = words.at(0);
    const last = words.length > 1 ? words.at(-1) : undefined;
    const letters = [first, last]
        .map((word) => (word ? Array.from(word)[0] : ""))
        .join("");
    return (letters || Array.from(email.trim())[0] || "?").toUpperCase();
}

function UserAvatar({ user }: { user: NavUserProps }) {
    return (
        <Avatar>
            {user.image ? (
                <AvatarImage
                    src={user.image}
                    alt=""
                    referrerPolicy="no-referrer"
                />
            ) : null}
            <AvatarFallback className="text-xs font-medium text-foreground">
                {getInitials(user.name, user.email)}
            </AvatarFallback>
        </Avatar>
    );
}

export function NavUser({ user }: { user: NavUserProps }) {
    const { isMobile } = useSidebar();
    const [status, setStatus] = React.useState<"idle" | "pending" | "error">(
        "idle",
    );
    const displayName = user.name.trim() || user.email;

    async function logOut() {
        setStatus("pending");
        const result = await callAuth(() => authClient.signOut());
        if (result.error) {
            setStatus("error");
            return;
        }
        hardNavigate("/login");
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                className="aria-expanded:bg-sidebar-accent"
                            />
                        }
                    >
                        <UserAvatar user={user} />
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                                {displayName}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {user.email}
                            </span>
                        </div>
                        <EllipsisVerticalIcon className="ml-auto size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <UserAvatar user={user} />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium text-foreground">
                                            {displayName}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        {/* The error is part of the item: a menu may only
                            hold items, groups and separators. */}
                        <DropdownMenuItem
                            closeOnClick={false}
                            disabled={status === "pending"}
                            className="items-start"
                            aria-describedby={
                                status === "error" ? "log-out-error" : undefined
                            }
                            onClick={() => void logOut()}
                        >
                            <LogOutIcon className="mt-0.5" />
                            <span className="grid gap-0.5">
                                {status === "pending"
                                    ? "Logging out…"
                                    : "Log out"}
                                {status === "error" ? (
                                    <span
                                        id="log-out-error"
                                        role="alert"
                                        className="text-xs text-destructive!"
                                    >
                                        Couldn&apos;t log out. Try again.
                                    </span>
                                ) : null}
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
