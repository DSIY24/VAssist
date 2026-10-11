"use client";

import * as React from "react";
import { verificationCodeSchema } from "@vassist/shared";
import {
    AuthHeader,
    AuthLink,
    Email,
    FormNotice,
} from "@/components/auth/auth-parts";
import { sendVerificationCode } from "@/components/auth/auth-actions";
import { CodeInput } from "@/components/auth/code-input";
import { useCooldown } from "@/components/auth/use-cooldown";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage, callAuth } from "@/lib/auth/errors";

export const RESEND_COOLDOWN_SECONDS = 30;

/**
 * The email verification step shared by sign-up and by a log-in for an address
 * that is not verified yet.
 *
 * `sentAt` is when the caller asked for the code (`Date.now()`), or `null` when
 * that request failed, in which case `sendError` says why and "Send code" is
 * ready straight away.
 *
 * `onVerified` runs once the code is accepted, with `true` when verifying also
 * signed the person in. It normally navigates away, and this step stays
 * pending. When it resolves with a message instead, the step shows it and the
 * button calls `onVerified` again: the code is spent, so it is not checked
 * twice.
 */
export function VerifyCodeStep({
    email,
    intent,
    sentAt,
    sendError,
    onVerified,
    onBack,
}: {
    email: string;
    intent: "signup" | "login";
    sentAt: number | null;
    sendError?: string;
    onVerified: (signedIn: boolean) => void | Promise<string | void>;
    onBack: () => void;
}) {
    const [code, setCode] = React.useState("");
    // False until a code has gone out, so the copy never claims one was sent.
    const [sent, setSent] = React.useState(sentAt !== null);
    // What is wrong with the code that was typed.
    const [codeError, setCodeError] = React.useState<string | null>(null);
    // What went wrong with a request other than checking the code.
    const [formError, setFormError] = React.useState<string | null>(
        sendError ?? null,
    );
    const [pending, setPending] = React.useState<"verify" | "resend" | null>(
        null,
    );
    const [resent, setResent] = React.useState(false);
    // The code was accepted; `signedIn` is what verifying reported.
    const [verified, setVerified] = React.useState<{
        signedIn: boolean;
    } | null>(null);
    const cooldown = useCooldown(sentAt, RESEND_COOLDOWN_SECONDS);
    const inputRef = React.useRef<HTMLInputElement>(null);
    // Auto-submit and the button can both fire for one code.
    const busy = React.useRef(false);
    // A wrong code or a new one clears the field and puts the caret back in
    // it, once the field is enabled again.
    const refocus = React.useRef(false);
    React.useEffect(() => {
        if (pending === null && refocus.current) {
            refocus.current = false;
            inputRef.current?.focus();
        }
    }, [pending]);

    async function finish(signedIn: boolean) {
        const message = await onVerified(signedIn);
        if (typeof message !== "string") return;
        busy.current = false;
        setPending(null);
        setFormError(message);
    }

    async function verify(value: string) {
        if (busy.current) return;
        if (verified) {
            busy.current = true;
            setPending("verify");
            setFormError(null);
            await finish(verified.signedIn);
            return;
        }
        const parsed = verificationCodeSchema.safeParse(value);
        if (!parsed.success) {
            setCodeError(
                parsed.error.issues.map((issue) => issue.message).join(" "),
            );
            return;
        }
        busy.current = true;
        setPending("verify");
        setCodeError(null);
        setFormError(null);
        setResent(false);
        const result = await callAuth(() =>
            authClient.emailOtp.verifyEmail({ email, otp: value }),
        );
        if (result.error) {
            busy.current = false;
            setPending(null);
            setCodeError(authErrorMessage(result.error));
            setCode("");
            refocus.current = true;
            return;
        }
        // A session exists only when the answer carries its token.
        const signedIn = typeof result.data.token === "string";
        setVerified({ signedIn });
        await finish(signedIn);
    }

    async function resend() {
        if (busy.current || cooldown.remaining > 0 || verified) return;
        busy.current = true;
        setPending("resend");
        setCodeError(null);
        setFormError(null);
        setResent(false);
        const result = await sendVerificationCode(email);
        busy.current = false;
        if (result.error) {
            setPending(null);
            setFormError(authErrorMessage(result.error));
            return;
        }
        // The button is about to count down, disabled: put focus back in the
        // code field, which is where the new code goes.
        refocus.current = true;
        setPending(null);
        setCode("");
        // The first code to go out changes the copy; a later one is "new".
        setResent(sent);
        setSent(true);
        cooldown.start();
    }

    return (
        <form
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                void verify(code);
            }}
        >
            <FieldGroup>
                <AuthHeader title="Verify your email">
                    {sent ? (
                        <>
                            We sent a 6-digit code to <Email>{email}</Email>.{" "}
                            {intent === "signup"
                                ? "Enter it to finish signing up."
                                : "Enter it to finish logging in."}
                        </>
                    ) : (
                        <>
                            We couldn&apos;t send a code to{" "}
                            <Email>{email}</Email>. Try again.
                        </>
                    )}
                    {intent === "signup" ? (
                        <>
                            {" "}
                            Already have an account?{" "}
                            <AuthLink href="/login">Log in</AuthLink>
                        </>
                    ) : null}
                </AuthHeader>
                <Field data-invalid={codeError ? true : undefined}>
                    <FieldLabel htmlFor="verification-code">
                        Verification code
                    </FieldLabel>
                    <CodeInput
                        ref={inputRef}
                        id="verification-code"
                        value={code}
                        onChange={(value) => {
                            setCode(value);
                            if (codeError) setCodeError(null);
                        }}
                        onComplete={(value) => void verify(value)}
                        disabled={pending !== null || verified !== null}
                        invalid={codeError !== null}
                        aria-describedby={
                            codeError ? "verification-code-error" : undefined
                        }
                        autoFocus
                    />
                    <FieldError id="verification-code-error">
                        {codeError}
                    </FieldError>
                </Field>
                <FieldError>{formError}</FieldError>
                {resent ? (
                    <FormNotice>
                        We sent a new code. Check your email.
                    </FormNotice>
                ) : null}
                <Field>
                    <Button type="submit" disabled={pending !== null}>
                        {pending === "verify" ? "Verifying…" : "Verify"}
                    </Button>
                </Field>
                <div className="flex flex-col items-center gap-1">
                    <Button
                        type="button"
                        variant="link"
                        disabled={
                            pending !== null ||
                            cooldown.remaining > 0 ||
                            verified !== null
                        }
                        onClick={() => void resend()}
                    >
                        {pending === "resend"
                            ? "Sending…"
                            : cooldown.remaining > 0
                              ? `Resend code in ${cooldown.remaining}s`
                              : sent
                                ? "Resend code"
                                : "Send code"}
                    </Button>
                    <Button
                        type="button"
                        variant="link"
                        className="text-muted-foreground"
                        disabled={pending !== null}
                        onClick={onBack}
                    >
                        Use a different email
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}
