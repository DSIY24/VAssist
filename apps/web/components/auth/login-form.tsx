"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginInputSchema, type LoginInput } from "@vassist/shared";
import { useForm } from "react-hook-form";
import {
    continueWithGoogle,
    sendLoginLink,
    sendVerificationCode,
} from "@/components/auth/auth-actions";
import {
    AuthFooter,
    AuthHeader,
    AuthLink,
    Email,
    FormNotice,
} from "@/components/auth/auth-parts";
import { GoogleButton } from "@/components/auth/google-button";
import { useClearPendingOnRestore } from "@/components/auth/use-page-restore";
import { VerifyCodeStep } from "@/components/auth/verify-code-step";
import { Button } from "@/components/ui/button";
import {
    Field,
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
    sendFailed,
    type AuthFailure,
} from "@/lib/auth/errors";
import { hardNavigate } from "@/lib/navigation";

type View =
    | { name: "form" }
    | { name: "link-sent"; email: string }
    | {
          name: "code";
          email: string;
          sentAt: number | null;
          sendError?: string;
      };

/** The one message for the notices `/login` can be opened with. */
function useNotice() {
    const params = useSearchParams();
    // A failed, expired or unknown-address log-in link and a Google error all
    // land here with `?error=…`. So does a callback whose verifier was never
    // traded for a session: the gate redirects anyone who has one, so a
    // verifier still in the URL here is a leftover. One message for all of
    // them, on purpose.
    if (params.has("error") || params.has("neon_auth_session_verifier")) {
        return "That didn't work. Try again, or sign up if you don't have an account.";
    }
    if (params.get("reset") === "1") {
        return "Password updated. Log in with your new password.";
    }
    if (params.get("verified") === "1") {
        return "Email verified. Log in to continue.";
    }
    return null;
}

export function LoginForm() {
    const notice = useNotice();
    const [view, setView] = React.useState<View>({ name: "form" });
    const [pending, setPending] = React.useState<
        "password" | "link" | "google" | null
    >(null);
    const [formError, setFormError] = React.useState<string | null>(null);
    // True once the person has come back to the form from another view, so
    // its heading takes focus then and not on first load.
    const [returned, setReturned] = React.useState(false);
    useClearPendingOnRestore(setPending);
    // Kept in memory only, to finish the log-in after the code step.
    const password = React.useRef("");
    const form = useForm<LoginInput>({
        resolver: zodResolver(loginInputSchema),
        defaultValues: { email: "", password: "" },
    });
    const { errors } = form.formState;

    function fail(error: AuthFailure) {
        setPending(null);
        setFormError(authErrorMessage(error));
    }

    async function logIn(values: LoginInput) {
        if (pending) return;
        setPending("password");
        setFormError(null);
        const result = await callAuth(() => authClient.signIn.email(values));
        if (!result.error) {
            hardNavigate("/dashboard");
            return;
        }
        if (authErrorKind(result.error) !== "email_not_confirmed") {
            fail(result.error);
            return;
        }
        // The password was right but the address was never verified.
        password.current = values.password;
        const sent = await sendVerificationCode(values.email);
        setPending(null);
        setView({
            name: "code",
            email: values.email,
            sentAt: sent.error ? null : Date.now(),
            sendError: sent.error ? authErrorMessage(sent.error) : undefined,
        });
    }

    async function emailLink() {
        if (pending) return;
        form.clearErrors("password");
        if (!(await form.trigger("email", { shouldFocus: true }))) return;
        const email = loginInputSchema.shape.email.parse(
            form.getValues("email"),
        );
        setPending("link");
        setFormError(null);
        const result = await sendLoginLink(email);
        if (result.error && sendFailed(result.error)) {
            fail(result.error);
            return;
        }
        // Every other outcome looks the same, so the page never says whether
        // the address has an account.
        setPending(null);
        setView({ name: "link-sent", email });
    }

    async function google() {
        if (pending) return;
        setPending("google");
        setFormError(null);
        const result = await continueWithGoogle();
        // On success the browser is already leaving for Google.
        if (result.error) fail(result.error);
    }

    async function finishLogIn(signedIn: boolean, email: string) {
        if (!signedIn) {
            const result = await callAuth(() =>
                authClient.signIn.email({
                    email,
                    password: password.current,
                }),
            );
            if (result.error) {
                hardNavigate("/login?verified=1");
                return;
            }
        }
        hardNavigate("/dashboard");
    }

    function backToForm() {
        password.current = "";
        form.resetField("password");
        setFormError(null);
        setReturned(true);
        setView({ name: "form" });
    }

    if (view.name === "code") {
        return (
            <VerifyCodeStep
                email={view.email}
                intent="login"
                sentAt={view.sentAt}
                sendError={view.sendError}
                onVerified={(signedIn) => finishLogIn(signedIn, view.email)}
                onBack={backToForm}
            />
        );
    }

    if (view.name === "link-sent") {
        return (
            <FieldGroup>
                <AuthHeader title="Check your email" focusOnMount status>
                    If <Email>{view.email}</Email> has an account, we sent it a
                    log-in link. The link expires in 5 minutes.
                </AuthHeader>
                <Button type="button" variant="outline" onClick={backToForm}>
                    Use a different email
                </Button>
                <AuthFooter>
                    Don&apos;t have an account?{" "}
                    <AuthLink href="/signup">Sign up</AuthLink>
                </AuthFooter>
            </FieldGroup>
        );
    }

    return (
        <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(logIn)(event)}
        >
            <FieldGroup>
                <AuthHeader title="Log in" focusOnMount={returned}>
                    Welcome back. Log in to your dashboard.
                </AuthHeader>
                {notice ? <FormNotice>{notice}</FormNotice> : null}
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
                    {/* The link sits beside the label but follows the input in
                        the DOM, so Tab goes from email straight to password. */}
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <FieldLabel htmlFor="password" className="row-start-1">
                            Password
                        </FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className="col-span-2 row-start-2"
                            aria-invalid={errors.password ? true : undefined}
                            aria-describedby={
                                errors.password ? "password-error" : undefined
                            }
                            {...form.register("password")}
                        />
                        <AuthLink
                            href="/forgot-password"
                            className="col-start-2 row-start-1 text-sm font-normal no-underline hover:underline"
                        >
                            Forgot password?
                        </AuthLink>
                    </div>
                    <FieldError
                        id="password-error"
                        errors={[errors.password]}
                    />
                </Field>
                <FieldError>{formError}</FieldError>
                <Field>
                    <Button type="submit" disabled={pending !== null}>
                        {pending === "password" ? "Logging in…" : "Log in"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending !== null}
                        onClick={() => void emailLink()}
                    >
                        {pending === "link"
                            ? "Sending link…"
                            : "Email me a log-in link"}
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
                    Don&apos;t have an account?{" "}
                    <AuthLink href="/signup">Sign up</AuthLink>
                </AuthFooter>
            </FieldGroup>
        </form>
    );
}
