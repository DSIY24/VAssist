"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailInputSchema, type EmailInput } from "@vassist/shared";
import { useForm } from "react-hook-form";
import { AuthFooter, AuthHeader, AuthLink } from "@/components/auth/auth-parts";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage, callAuth, sendFailed } from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";

export function ForgotPasswordForm() {
    const [pending, setPending] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);
    const form = useForm<EmailInput>({
        resolver: zodResolver(emailInputSchema),
        defaultValues: { email: "" },
    });
    const { errors } = form.formState;

    async function sendCode({ email }: EmailInput) {
        if (pending) return;
        setPending(true);
        setFormError(null);
        const result = await callAuth(() =>
            authClient.forgetPassword.emailOtp({ email }),
        );
        if (result.error && sendFailed(result.error)) {
            setPending(false);
            setFormError(authErrorMessage(result.error));
            return;
        }
        // Every other outcome continues the same way, so the page never says
        // whether the address has an account.
        hardNavigate(`/reset-password?email=${encodeURIComponent(email)}`);
    }

    return (
        <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(sendCode)(event)}
        >
            <FieldGroup>
                <AuthHeader title="Reset your password">
                    Enter your email and we&apos;ll send you a 6-digit code.
                </AuthHeader>
                <Field data-invalid={errors.email ? true : undefined}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={
                            errors.email ? "email-error" : undefined
                        }
                        {...form.register("email")}
                    />
                    <FieldError id="email-error" errors={[errors.email]} />
                </Field>
                <FieldError>{formError}</FieldError>
                <Field>
                    <Button type="submit" disabled={pending}>
                        {pending ? "Sending code…" : "Send code"}
                    </Button>
                </Field>
                <AuthFooter>
                    Remembered it? <AuthLink href="/login">Log in</AuthLink>
                </AuthFooter>
            </FieldGroup>
        </form>
    );
}
