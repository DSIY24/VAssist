"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupInputSchema, type SignupInput } from "@vassist/shared";
import { useForm } from "react-hook-form";
import {
    continueWithGoogle,
    sendVerificationCode,
} from "@/components/auth/auth-actions";
import { AuthFooter, AuthHeader, AuthLink } from "@/components/auth/auth-parts";
import { GoogleButton } from "@/components/auth/google-button";
import { useClearPendingOnRestore } from "@/components/auth/use-page-restore";
import { VerifyCodeStep } from "@/components/auth/verify-code-step";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
    authErrorKind,
    authErrorMessage,
    callAuth,
    type AuthFailure,
} from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";

type CodeView = { email: string; sentAt: number | null; sendError?: string };

/**
 * Sign-up for an address that already has an account. Neon usually answers
 * that with a plain 200. When it does not, the error says so in its code
 * (`user_already_exists`) or, for a 422 whose code the adapter does not
 * translate, in the server's message.
 */
function isExistingAccount(error: AuthFailure) {
    return (
        error.code?.startsWith("user_already_exists") === true ||
        (error.status === 422 &&
            error.message.toLowerCase().includes("already exists"))
    );
}

export function SignupForm() {
    const [codeView, setCodeView] = React.useState<CodeView | null>(null);
    const [pending, setPending] = React.useState<"signup" | "google" | null>(
        null,
    );
    const [formError, setFormError] = React.useState<string | null>(null);
    // True once the person has come back from the code step, so the heading
    // takes focus then and not on first load.
    const [returned, setReturned] = React.useState(false);
    useClearPendingOnRestore(setPending);
    // Kept in memory only, to prove after the code step that the account has
    // this password.
    const password = React.useRef("");
    const form = useForm<SignupInput>({
        resolver: zodResolver(signupInputSchema),
        defaultValues: { name: "", email: "", password: "" },
    });
    const { errors } = form.formState;

    function fail(error: AuthFailure) {
        setPending(null);
        setFormError(authErrorMessage(error));
    }

    async function signUp(values: SignupInput) {
        if (pending) return;
        setPending("signup");
        setFormError(null);
        const result = await callAuth(() => authClient.signUp.email(values));
        // An address that already has an account gets the same code step as a
        // new one, so the page never says which it was.
        if (result.error && !isExistingAccount(result.error)) {
            fail(result.error);
            return;
        }
        password.current = values.password;
        // Sign-up does not send the code: ask for it here.
        const sent = await sendVerificationCode(values.email);
        setPending(null);
        setCodeView({
            email: values.email,
            sentAt: sent.error ? null : Date.now(),
            sendError: sent.error ? authErrorMessage(sent.error) : undefined,
        });
    }

    async function google() {
        if (pending) return;
        setPending("google");
        setFormError(null);
        const result = await continueWithGoogle();
        // On success the browser is already leaving for Google.
        if (result.error) fail(result.error);
    }

    /**
     * Runs once the code is accepted. Returns a message when it could not
     * finish and the person should try again from the code step.
     *
     * Sign-up answers the same way for an address that already has an account,
     * and the code then verifies that account. It may have been registered by
     * someone else, with their password. So the typed password always has to
     * prove itself with a log-in before this goes on, whether or not verifying
     * already opened a session.
     */
    async function finishSignUp(email: string): Promise<string | void> {
        const result = await callAuth(() =>
            authClient.signIn.email({ email, password: password.current }),
        );
        if (!result.error) {
            hardNavigate("/onboarding");
            return;
        }
        // Whatever verifying opened is a session for an account this password
        // has not been shown to own. A failure to close it changes nothing
        // below.
        await callAuth(() => authClient.signOut());
        if (authErrorKind(result.error) !== "invalid_credentials") {
            return authErrorMessage(result.error);
        }
        // The account was there before, with another password. Whoever reads
        // this inbox sets a new one, which replaces the old one.
        password.current = "";
        await callAuth(() => authClient.forgetPassword.emailOtp({ email }));
        hardNavigate(
            `/reset-password?email=${encodeURIComponent(email)}&existing=1`,
        );
    }

    if (codeView) {
        return (
            <VerifyCodeStep
                email={codeView.email}
                intent="signup"
                sentAt={codeView.sentAt}
                sendError={codeView.sendError}
                onVerified={() => finishSignUp(codeView.email)}
                onBack={() => {
                    password.current = "";
                    form.resetField("password");
                    setReturned(true);
                    setCodeView(null);
                }}
            />
        );
    }

    return (
        <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(signUp)(event)}
        >
            <FieldGroup>
                <AuthHeader title="Create your account" focusOnMount={returned}>
                    Set up support chat for your website.
                </AuthHeader>
                <Field data-invalid={errors.name ? true : undefined}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                        id="name"
                        type="text"
                        autoComplete="name"
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={
                            errors.name ? "name-error" : undefined
                        }
                        {...form.register("name")}
                    />
                    <FieldError id="name-error" errors={[errors.name]} />
                </Field>
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
                <Field data-invalid={errors.password ? true : undefined}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
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
                <Field>
                    <Button type="submit" disabled={pending !== null}>
                        {pending === "signup" ? "Signing up…" : "Sign up"}
                    </Button>
                </Field>
                <FieldSeparator>or</FieldSeparator>
                <Field>
                    <GoogleButton
                        pending={pending === "google"}
                        disabled={pending !== null}
                        onClick={() => void google()}
                    />
                </Field>
                <AuthFooter>
                    Already have an account?{" "}
                    <AuthLink href="/login">Log in</AuthLink>
                </AuthFooter>
            </FieldGroup>
        </form>
    );
}
