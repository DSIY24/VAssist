"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    emailSchema,
    resetPasswordInputSchema,
    type ResetPasswordInput,
} from "@vassist/shared";
import { Controller, useForm } from "react-hook-form";
import {
    AuthFooter,
    AuthHeader,
    AuthLink,
    Email,
    FormNotice,
} from "@/components/auth/auth-parts";
import { CodeInput } from "@/components/auth/code-input";
import { useCooldown } from "@/components/auth/use-cooldown";
import { RESEND_COOLDOWN_SECONDS } from "@/components/auth/verify-code-step";
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
import {
    authErrorKind,
    authErrorMessage,
    callAuth,
    sendFailed,
} from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";

/** Reads the address `/forgot-password` passed along in the query. */
export function ResetPasswordForm() {
    const params = useSearchParams();
    const parsed = emailSchema.safeParse(params.get("email") ?? "");
    if (!parsed.success) {
        return (
            <FieldGroup>
                <AuthHeader title="Reset your password">
                    Start by asking for a code. We&apos;ll email it to you.
                </AuthHeader>
                <Button
                    nativeButton={false}
                    render={<Link href="/forgot-password" />}
                >
                    Get a code
                </Button>
                <AuthFooter>
                    Remembered it? <AuthLink href="/login">Log in</AuthLink>
                </AuthFooter>
            </FieldGroup>
        );
    }
    return (
        <ResetPasswordFields
            email={parsed.data}
            // Set by sign-up when the address turned out to have an account
            // whose password is not the one just typed.
            existing={params.get("existing") === "1"}
        />
    );
}

function ResetPasswordFields({
    email,
    existing,
}: {
    email: string;
    existing: boolean;
}) {
    const [pending, setPending] = React.useState<"update" | "resend" | null>(
        null,
    );
    const [formError, setFormError] = React.useState<string | null>(null);
    const [resent, setResent] = React.useState(false);
    const cooldown = useCooldown(null, RESEND_COOLDOWN_SECONDS);
    const form = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordInputSchema),
        defaultValues: { code: "", password: "" },
        // React Hook Form would focus the first field it registered, which is
        // the password. The submit handler below picks the field instead.
        shouldFocusError: false,
    });
    const { errors } = form.formState;
    // The code field is disabled while a request runs, so a server error
    // moves focus to its field once the form is enabled again.
    const refocus = React.useRef<"code" | "password" | null>(null);
    const { setFocus } = form;
    React.useEffect(() => {
        if (pending === null && refocus.current) {
            setFocus(refocus.current);
            refocus.current = null;
        }
    }, [pending, setFocus]);

    async function updatePassword({ code, password }: ResetPasswordInput) {
        if (pending) return;
        setPending("update");
        setFormError(null);
        setResent(false);
        const result = await callAuth(() =>
            authClient.emailOtp.resetPassword({ email, otp: code, password }),
        );
        if (!result.error) {
            hardNavigate("/login?reset=1");
            return;
        }
        setPending(null);
        const kind = authErrorKind(result.error);
        const message = authErrorMessage(result.error);
        if (
            kind === "invalid_code" ||
            kind === "expired_code" ||
            kind === "too_many_attempts"
        ) {
            form.resetField("code");
            form.setError("code", { message });
            refocus.current = "code";
        } else if (kind === "weak_password") {
            form.setError("password", { message });
            refocus.current = "password";
        } else {
            setFormError(message);
        }
    }

    async function resend() {
        if (pending || cooldown.remaining > 0) return;
        setPending("resend");
        setFormError(null);
        setResent(false);
        const result = await callAuth(() =>
            authClient.forgetPassword.emailOtp({ email }),
        );
        if (result.error && sendFailed(result.error)) {
            setPending(null);
            setFormError(authErrorMessage(result.error));
            return;
        }
        // The button is about to count down, disabled: put focus back in the
        // code field, which is where the new code goes.
        refocus.current = "code";
        setPending(null);
        form.resetField("code");
        setResent(true);
        cooldown.start();
    }

    return (
        <form
            noValidate
            onSubmit={(event) =>
                void form.handleSubmit(updatePassword, (invalid) =>
                    // Top to bottom: the code field comes first.
                    form.setFocus(invalid.code ? "code" : "password"),
                )(event)
            }
        >
            <FieldGroup>
                <AuthHeader title="Reset your password">
                    If an account exists for <Email>{email}</Email>, we sent a
                    6-digit code.
                </AuthHeader>
                {existing ? (
                    <FormNotice>
                        This email already has an account. Enter the code we
                        just sent and choose a new password to continue.
                    </FormNotice>
                ) : null}
                <Field data-invalid={errors.code ? true : undefined}>
                    <FieldLabel htmlFor="reset-code">Code</FieldLabel>
                    <Controller
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <CodeInput
                                ref={field.ref}
                                id="reset-code"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                disabled={pending !== null}
                                invalid={Boolean(errors.code)}
                                aria-describedby={
                                    errors.code ? "reset-code-error" : undefined
                                }
                                autoFocus
                            />
                        )}
                    />
                    <FieldError id="reset-code-error" errors={[errors.code]} />
                </Field>
                <Field data-invalid={errors.password ? true : undefined}>
                    <FieldLabel htmlFor="password">New password</FieldLabel>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={
                            errors.password ? "password-error" : "password-hint"
                        }
                        {...form.register("password")}
                    />
                    {errors.password ? (
                        <FieldError
                            id="password-error"
                            errors={[errors.password]}
                        />
                    ) : (
                        <FieldDescription id="password-hint">
                            At least 8 characters.
                        </FieldDescription>
                    )}
                </Field>
                <FieldError>{formError}</FieldError>
                {resent ? (
                    <FormNotice>
                        If an account exists, we sent a new code.
                    </FormNotice>
                ) : null}
                <Field>
                    <Button type="submit" disabled={pending !== null}>
                        {pending === "update"
                            ? "Updating password…"
                            : "Update password"}
                    </Button>
                </Field>
                <div className="flex flex-col items-center gap-1">
                    <Button
                        type="button"
                        variant="link"
                        disabled={pending !== null || cooldown.remaining > 0}
                        onClick={() => void resend()}
                    >
                        {pending === "resend"
                            ? "Sending…"
                            : cooldown.remaining > 0
                              ? `Resend code in ${cooldown.remaining}s`
                              : "Resend code"}
                    </Button>
                    <AuthLink
                        href="/forgot-password"
                        className="text-sm text-muted-foreground no-underline hover:underline"
                    >
                        Use a different email
                    </AuthLink>
                </div>
            </FieldGroup>
        </form>
    );
}
