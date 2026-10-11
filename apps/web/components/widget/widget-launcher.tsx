import { MessageCircleIcon, XIcon } from "lucide-react";
import type { WidgetColor } from "@vassist/shared";
import { cn } from "@/lib/utils";
import { widgetAccentStyle } from "./widget-accent";

/**
 * The launcher bubble that opens and closes the widget. Its icon is fixed
 * (PRD D-9); only the accent colour changes.
 */
export function WidgetLauncher({
    color,
    open,
    onToggle,
    className,
}: {
    color: WidgetColor;
    open: boolean;
    onToggle?: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            style={widgetAccentStyle(color)}
            aria-expanded={open}
            aria-label={open ? "Close chat" : "Open chat"}
            onClick={onToggle}
            className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full bg-(--widget-accent) text-(--widget-accent-foreground) shadow-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                className,
            )}
        >
            {open ? (
                <XIcon className="size-5" />
            ) : (
                <MessageCircleIcon className="size-5" />
            )}
        </button>
    );
}
