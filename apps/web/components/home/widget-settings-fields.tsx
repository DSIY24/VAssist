"use client";

import * as React from "react";
import {
    GREETING_MAX_LENGTH,
    WIDGET_ACCENTS,
    WIDGET_COLORS,
    type WidgetColor,
    type WidgetPosition,
    type WidgetSettingsForm,
} from "@vassist/shared";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const POSITIONS: readonly { value: WidgetPosition; label: string }[] = [
    { value: "bottom_left", label: "Bottom left" },
    { value: "bottom_right", label: "Bottom right" },
];

/** A page in miniature with the launcher in its corner. Decorative. */
function PositionDiagram({ position }: { position: WidgetPosition }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex h-9 w-14 shrink-0 items-end rounded-md border bg-background p-1",
                position === "bottom_right" && "justify-end",
            )}
        >
            <span className="size-2.5 rounded-full bg-foreground" />
        </span>
    );
}

/**
 * The widget settings that save on their own (PRD D-9). Text fields report
 * every change and their blur; choices report once, when picked.
 */
export function WidgetSettingsFields({
    form,
    defaultAgentName,
    onTextChange,
    onTextBlur,
    onChoice,
}: {
    form: UseFormReturn<WidgetSettingsForm>;
    defaultAgentName: string;
    onTextChange: (name: "agentName" | "greeting") => void;
    onTextBlur: (name: "agentName" | "greeting") => void;
    onChoice: (name: "color" | "position") => void;
}) {
    const { errors } = form.formState;
    const greetingLength = useWatch({
        control: form.control,
        name: "greeting",
    }).length;

    return (
        <FieldGroup>
            <Field data-invalid={errors.agentName ? true : undefined}>
                <FieldLabel htmlFor="agent-name">Agent name</FieldLabel>
                <Input
                    id="agent-name"
                    autoComplete="off"
                    placeholder={defaultAgentName}
                    aria-invalid={errors.agentName ? true : undefined}
                    aria-describedby={
                        errors.agentName
                            ? "agent-name-error"
                            : "agent-name-hint"
                    }
                    {...form.register("agentName", {
                        onChange: () => onTextChange("agentName"),
                        onBlur: () => onTextBlur("agentName"),
                    })}
                />
                {errors.agentName ? (
                    <FieldError
                        id="agent-name-error"
                        errors={[errors.agentName]}
                    />
                ) : (
                    <FieldDescription id="agent-name-hint">
                        The name visitors see on the agent&apos;s messages.
                        Leave it empty to use &ldquo;{defaultAgentName}&rdquo;.
                    </FieldDescription>
                )}
            </Field>

            <Field data-invalid={errors.greeting ? true : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                    <FieldLabel htmlFor="greeting">Greeting</FieldLabel>
                    <span
                        className={cn(
                            "text-xs text-muted-foreground tabular-nums",
                            greetingLength > GREETING_MAX_LENGTH &&
                                "text-destructive",
                        )}
                    >
                        {greetingLength}/{GREETING_MAX_LENGTH}
                    </span>
                </div>
                <Textarea
                    id="greeting"
                    rows={3}
                    aria-invalid={errors.greeting ? true : undefined}
                    aria-describedby={
                        errors.greeting ? "greeting-error" : "greeting-hint"
                    }
                    {...form.register("greeting", {
                        onChange: () => onTextChange("greeting"),
                        onBlur: () => onTextBlur("greeting"),
                    })}
                />
                {errors.greeting ? (
                    <FieldError
                        id="greeting-error"
                        errors={[errors.greeting]}
                    />
                ) : (
                    <FieldDescription id="greeting-hint">
                        The first message a visitor sees when they open the
                        widget.
                    </FieldDescription>
                )}
            </Field>

            <Controller
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FieldSet>
                        <FieldLegend variant="label">
                            Accent color
                            <span className="ml-2 font-normal text-muted-foreground">
                                {WIDGET_ACCENTS[field.value].label}
                            </span>
                        </FieldLegend>
                        <RadioGroup
                            aria-label="Accent color"
                            value={field.value}
                            onValueChange={(value) => {
                                field.onChange(value as WidgetColor);
                                onChoice("color");
                            }}
                            className="flex w-auto flex-wrap gap-3"
                        >
                            {WIDGET_COLORS.map((color) => (
                                <RadioGroupItem
                                    key={color}
                                    value={color}
                                    aria-label={WIDGET_ACCENTS[color].label}
                                    style={
                                        {
                                            "--swatch":
                                                WIDGET_ACCENTS[color]
                                                    .background,
                                            "--swatch-foreground":
                                                WIDGET_ACCENTS[color]
                                                    .foreground,
                                        } as React.CSSProperties
                                    }
                                    className="size-8 border-transparent bg-(--swatch) ring-offset-2 ring-offset-card dark:bg-(--swatch) data-checked:border-transparent data-checked:bg-(--swatch) data-checked:ring-2 data-checked:ring-foreground dark:data-checked:bg-(--swatch) [&_[data-slot=radio-group-indicator]]:size-8 [&_[data-slot=radio-group-indicator]>span]:bg-(--swatch-foreground)"
                                />
                            ))}
                        </RadioGroup>
                    </FieldSet>
                )}
            />

            <Controller
                control={form.control}
                name="position"
                render={({ field }) => (
                    <FieldSet>
                        <FieldLegend variant="label">Position</FieldLegend>
                        <RadioGroup
                            aria-label="Position"
                            value={field.value}
                            onValueChange={(value) => {
                                field.onChange(value as WidgetPosition);
                                onChoice("position");
                            }}
                            className="grid-cols-1 sm:grid-cols-2"
                        >
                            {POSITIONS.map((position) => (
                                <FieldLabel
                                    key={position.value}
                                    htmlFor={`position-${position.value}`}
                                >
                                    <Field
                                        orientation="horizontal"
                                        className="items-center!"
                                    >
                                        <PositionDiagram
                                            position={position.value}
                                        />
                                        <FieldContent>
                                            <FieldTitle>
                                                {position.label}
                                            </FieldTitle>
                                        </FieldContent>
                                        <RadioGroupItem
                                            value={position.value}
                                            id={`position-${position.value}`}
                                        />
                                    </Field>
                                </FieldLabel>
                            ))}
                        </RadioGroup>
                    </FieldSet>
                )}
            />
        </FieldGroup>
    );
}
