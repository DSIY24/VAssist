"use client";

import * as React from "react";
import type { WidgetColor, WidgetPosition } from "@vassist/shared";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WidgetLauncher } from "@/components/widget/widget-launcher";
import type { WidgetMessageData } from "@/components/widget/widget-message";
import { WidgetPanel } from "@/components/widget/widget-panel";
import { cn } from "@/lib/utils";

export type WidgetPreviewValues = {
    color: WidgetColor;
    position: WidgetPosition;
    agentName: string;
    agentAvatarUrl: string | null;
    greeting: string;
    suggestedQuestions: readonly string[];
};

/**
 * The real widget components on a stand-in page, fed by the settings form, so
 * every change shows before it is saved (PRD D-8). The widget inside is inert:
 * it is a picture of the widget, not a second place to type.
 */
export function WidgetPreview({
    values,
    agentOn,
    title = "Preview",
    className,
}: {
    values: WidgetPreviewValues;
    /** Whether the agent is on right now. */
    agentOn: boolean;
    /** The heading beside the agent switch. */
    title?: string;
    className?: string;
}) {
    // Which state to show. It starts on the real one.
    const [shown, setShown] = React.useState<"off" | "on">(
        agentOn ? "on" : "off",
    );
    const showOn = shown === "on";
    const messages: WidgetMessageData[] = [
        {
            id: "greeting",
            author: "agent",
            name: values.agentName,
            avatarUrl: values.agentAvatarUrl,
            body: values.greeting,
        },
    ];

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">{title}</h2>
                <ToggleGroup
                    aria-label="Agent state to preview"
                    variant="outline"
                    size="sm"
                    spacing={0}
                    value={[shown]}
                    onValueChange={(value: string[]) => {
                        const next = value[0];
                        if (next === "on" || next === "off") setShown(next);
                    }}
                >
                    <ToggleGroupItem value="off">Agent off</ToggleGroupItem>
                    <ToggleGroupItem value="on">Agent on</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <div
                data-position={values.position}
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/40 p-4"
            >
                {/* The stand-in page behind the widget. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-4 top-4 flex flex-col gap-3"
                >
                    <div className="h-3 w-24 rounded-full bg-foreground/10" />
                    <div className="h-2 w-3/4 rounded-full bg-foreground/5" />
                    <div className="h-2 w-2/3 rounded-full bg-foreground/5" />
                    <div className="h-2 w-1/2 rounded-full bg-foreground/5" />
                </div>
                <p className="sr-only">
                    The widget as visitors see it, with your current settings:
                    {values.position === "bottom_left"
                        ? " bottom left"
                        : " bottom right"}{" "}
                    of the page, agent name {values.agentName}, greeting &ldquo;
                    {values.greeting}&rdquo;.
                </p>
                <div
                    inert
                    className={cn(
                        "relative flex min-h-0 flex-1 flex-col gap-3",
                        values.position === "bottom_left"
                            ? "items-start"
                            : "items-end",
                    )}
                >
                    <div className="min-h-0 w-full max-w-80 flex-1">
                        <WidgetPanel
                            color={values.color}
                            agentName={values.agentName}
                            agentAvatarUrl={values.agentAvatarUrl}
                            messages={messages}
                            suggestedQuestions={values.suggestedQuestions}
                            agentOn={showOn}
                            onClose={() => {}}
                        />
                    </div>
                    <WidgetLauncher color={values.color} open />
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                {agentOn
                    ? "Your agent is on. It answers visitors from your knowledge base."
                    : "Your agent is off until a source is ready, so every conversation comes to you. Visitors see no suggested questions and no “Talk to a human” button."}
            </p>
        </div>
    );
}
