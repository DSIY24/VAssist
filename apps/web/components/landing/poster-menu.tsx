"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** The compact-layout menu: a white burger that opens a frosted sheet. */
export function PosterMenu({
    links,
    cta,
    className,
}: {
    links: readonly { label: string; href: string }[];
    cta: { label: string; href: string };
    className?: string;
}) {
    return (
        <Sheet>
            <SheetTrigger
                render={
                    <Button
                        size="icon-lg"
                        aria-label="Open menu"
                        className={cn(
                            "size-11 rounded-full bg-poster-ink text-poster hover:bg-poster-ink/85",
                            className,
                        )}
                    />
                }
            >
                <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent
                side="top"
                className="dark gap-0 rounded-b-3xl border-white/10 bg-poster/70 pt-[env(safe-area-inset-top)] text-poster-ink backdrop-blur-2xl"
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>Navigate VAssist</SheetDescription>
                </SheetHeader>
                <nav aria-label="Primary" className="px-6 pt-16 pb-2">
                    <ul className="flex flex-col">
                        {links.map((link) => (
                            <li key={link.href}>
                                <SheetClose
                                    nativeButton={false}
                                    render={<Link href={link.href} />}
                                    className="block rounded-lg py-3 font-display text-4xl tracking-wide outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {link.label}
                                </SheetClose>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="p-6">
                    <Button
                        nativeButton={false}
                        render={<Link href={cta.href} />}
                        className="h-12 w-full rounded-full bg-poster-ink text-base font-normal text-poster hover:bg-poster-ink/85"
                    >
                        {cta.label}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
