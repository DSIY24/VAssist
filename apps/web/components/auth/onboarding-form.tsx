"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
    createWorkspaceInputSchema,
    type CreateWorkspaceInput,
} from "@vassist/shared";
import { useForm } from "react-hook-form";
import { AuthHeader } from "@/components/auth/auth-parts";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { callAuth } from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";
import { orpc } from "@/lib/orpc/client";

function errorCode(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
}

/** The first-run step: one field that names the owner's workspace. */
export function OnboardingForm() {
    const [loggingOut, setLoggingOut] = React.useState(false);
    const [logOutFailed, setLogOutFailed] = React.useState(false);
    const form = useForm<CreateWorkspaceInput>({
        resolver: zodResolver(createWorkspaceInputSchema),
        defaultValues: { name: "" },
    });
    const { errors } = form.formState;
    const createWorkspace = useMutation(
        orpc.workspace.create.mutationOptions({
            onSuccess: () => hardNavigate("/dashboard"),
            onError: (error) => {
                // The session ended while the form was open.
                if (errorCode(error) === "UNAUTHORIZED") hardNavigate("/login");
            },
        }),
    );
    const unauthorized = errorCode(createWorkspace.error) === "UNAUTHORIZED";
    // Stays busy after success and while leaving: the page is navigating away.
    const busy =
        createWorkspace.isPending ||
        createWorkspace.isSuccess ||
        unauthorized ||
        loggingOut;

    async function logOut() {
        if (busy) return;
        setLoggingOut(true);
        setLogOutFailed(false);
        const result = await callAuth(() => authClient.signOut());
        if (result.error) {
            setLoggingOut(false);
            setLogOutFailed(true);
            return;
        }
        hardNavigate("/login");
    }

    return (
        <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
                if (!busy) createWorkspace.mutate(values);
            })}
        >
            <FieldGroup>
                <AuthHeader title="What's your business called?">
                    One last step before your dashboard.
                </AuthHeader>
                <Field data-invalid={errors.name ? true : undefined}>
                    <FieldLabel htmlFor="name">Business name</FieldLabel>
                    <Input
                        id="name"
                        type="text"
                        autoComplete="organization"
                        autoFocus
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={
                            errors.name ? "name-error name-hint" : "name-hint"
                        }
                        {...form.register("name")}
                    />
                    <FieldError id="name-error" errors={[errors.name]} />
                    <FieldDescription id="name-hint">
                        This becomes your workspace name. You can change it
                        later in settings.
                    </FieldDescription>
                </Field>
                {createWorkspace.isError && !unauthorized ? (
                    <FieldError>
                        Couldn&apos;t create your workspace. Try again.
                    </FieldError>
                ) : null}
                <Field>
                    <Button type="submit" disabled={busy}>
                        {createWorkspace.isPending || createWorkspace.isSuccess
                            ? "Setting up…"
                            : "Continue"}
                    </Button>
                </Field>
                <div className="flex flex-col items-center gap-1">
                    <Button
                        type="button"
                        variant="link"
                        className="text-muted-foreground"
                        disabled={busy}
                        onClick={() => void logOut()}
                    >
                        {loggingOut ? "Logging out…" : "Log out"}
                    </Button>
                    {logOutFailed ? (
                        <FieldError>
                            Couldn&apos;t log out. Try again.
                        </FieldError>
                    ) : null}
                </div>
            </FieldGroup>
        </form>
    );
}
