"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    MAX_TEXT_SOURCE_CHARS,
    textSourceInputSchema,
    type Source,
    type TextSourceInput,
} from "@vassist/shared";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { hardNavigate } from "@/lib/navigation";
import { orpc } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";
import { errorCode } from "./home-parts";

/** What the dialog is open for: a new text source, or one to edit. */
export type TextSourceTarget =
    { mode: "create" } | { mode: "edit"; source: Source };

function TextSourceForm({
    id,
    defaultValues,
    onDone,
}: {
    /** The text source being edited. Absent when adding one. */
    id?: string;
    defaultValues: TextSourceInput;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const form = useForm<TextSourceInput>({
        resolver: zodResolver(textSourceInputSchema),
        defaultValues,
    });
    const { errors } = form.formState;
    const textLength = useWatch({ control: form.control, name: "text" }).length;

    const options = {
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: orpc.knowledge.key(),
            });
            onDone();
        },
        onError: (error: unknown) => {
            const code = errorCode(error);
            if (code === "UNAUTHORIZED") hardNavigate("/login");
            if (code === "CONFLICT") {
                form.setError(
                    "name",
                    { message: "Another source already uses this title." },
                    { shouldFocus: true },
                );
            }
        },
    };
    const create = useMutation(
        orpc.knowledge.createTextSource.mutationOptions(options),
    );
    const update = useMutation(
        orpc.knowledge.updateTextSource.mutationOptions(options),
    );
    const mutation = id ? update : create;
    const failure = mutation.error ? errorCode(mutation.error) : undefined;
    const formError =
        mutation.error && failure !== "CONFLICT" && failure !== "UNAUTHORIZED"
            ? failure === "NOT_FOUND"
                ? "This source no longer exists."
                : "Couldn't save. Try again."
            : null;

    return (
        <form
            noValidate
            onSubmit={(event) =>
                void form.handleSubmit((values) => {
                    if (id) update.mutate({ id, ...values });
                    else create.mutate(values);
                })(event)
            }
        >
            <FieldGroup>
                <Field data-invalid={errors.name ? true : undefined}>
                    <FieldLabel htmlFor="text-source-name">Title</FieldLabel>
                    <Input
                        id="text-source-name"
                        autoComplete="off"
                        placeholder="Refund policy"
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={
                            errors.name ? "text-source-name-error" : undefined
                        }
                        {...form.register("name")}
                    />
                    <FieldError
                        id="text-source-name-error"
                        errors={[errors.name]}
                    />
                </Field>
                <Field data-invalid={errors.text ? true : undefined}>
                    <div className="flex items-baseline justify-between gap-2">
                        <FieldLabel htmlFor="text-source-text">Text</FieldLabel>
                        <span
                            className={cn(
                                "text-xs text-muted-foreground tabular-nums",
                                textLength > MAX_TEXT_SOURCE_CHARS &&
                                    "text-destructive",
                            )}
                        >
                            {textLength.toLocaleString("en-US")}/
                            {MAX_TEXT_SOURCE_CHARS.toLocaleString("en-US")}
                        </span>
                    </div>
                    <Textarea
                        id="text-source-text"
                        placeholder="Write or paste what the agent should know."
                        className="max-h-[45svh] min-h-40 overflow-y-auto"
                        aria-invalid={errors.text ? true : undefined}
                        aria-describedby={
                            errors.text ? "text-source-text-error" : undefined
                        }
                        {...form.register("text")}
                    />
                    <FieldError
                        id="text-source-text-error"
                        errors={[errors.text]}
                    />
                </Field>
                <FieldError>{formError}</FieldError>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onDone}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending
                            ? "Saving…"
                            : id
                              ? "Save changes"
                              : "Add text source"}
                    </Button>
                </DialogFooter>
            </FieldGroup>
        </form>
    );
}

/** Loads the text of the source being edited, then shows the form. */
function EditTextSource({
    source,
    onDone,
}: {
    source: Source;
    onDone: () => void;
}) {
    const query = useQuery(
        orpc.knowledge.getTextSource.queryOptions({
            input: { id: source.id },
            // Always the saved text, never a copy cached before an edit.
            staleTime: 0,
            gcTime: 0,
        }),
    );
    if (query.isPending) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Spinner aria-label="Loading the text" />
            </div>
        );
    }
    if (query.isError) {
        return (
            <div className="flex flex-col items-start gap-3">
                <p role="alert" className="text-sm text-destructive">
                    {errorCode(query.error) === "NOT_FOUND"
                        ? "This source no longer exists."
                        : "Couldn't load the text."}
                </p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void query.refetch()}
                >
                    Try again
                </Button>
            </div>
        );
    }
    return (
        <TextSourceForm
            id={source.id}
            defaultValues={{ name: query.data.name, text: query.data.text }}
            onDone={onDone}
        />
    );
}

/** Add or edit a text source: a title plus text (PRD K-2). */
export function TextSourceDialog({
    target,
    onClose,
}: {
    target: TextSourceTarget | null;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={target !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {target?.mode === "edit"
                            ? "Edit text source"
                            : "Add text source"}
                    </DialogTitle>
                    <DialogDescription>
                        Text you write here becomes part of your knowledge base,
                        like an uploaded file.
                    </DialogDescription>
                </DialogHeader>
                {target?.mode === "edit" ? (
                    <EditTextSource
                        key={target.source.id}
                        source={target.source}
                        onDone={onClose}
                    />
                ) : target ? (
                    <TextSourceForm
                        defaultValues={{ name: "", text: "" }}
                        onDone={onClose}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
