"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The theme menu: light, dark, or whatever the system is set to. */
export function ModeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon"
                        className={className}
                    />
                }
            >
                {/* Both icons render and CSS picks one, so the server and the
                    client agree before the stored theme is known. */}
                <SunIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <MoonIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(String(value))}
                >
                    <DropdownMenuRadioItem value="light" closeOnClick>
                        Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" closeOnClick>
                        Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system" closeOnClick>
                        System
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
