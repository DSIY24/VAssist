import type * as React from "react";
import { WIDGET_ACCENTS, type WidgetColor } from "@vassist/shared";

/**
 * The workspace's accent as CSS variables. Widget components read them with
 * `bg-(--widget-accent)` and `text-(--widget-accent-foreground)`, so the
 * colour values stay in the palette in `@vassist/shared`.
 */
export function widgetAccentStyle(color: WidgetColor) {
    const accent = WIDGET_ACCENTS[color];
    return {
        "--widget-accent": accent.background,
        "--widget-accent-foreground": accent.foreground,
    } as React.CSSProperties;
}
