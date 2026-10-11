import { authClient } from "@/lib/auth/client";
import { callAuth } from "@/lib/auth/errors";

// Google and log-in links come back to `/dashboard`, where `proxy.ts` trades
// the verifier in the URL for a session; the dashboard's guard then sends an
// owner without a workspace to the first-run step. Failures come back to
// `/login?error=…`. Both URLs have to be absolute.

/** Sends the browser to Google. Resolves only if that could not start. */
export function continueWithGoogle() {
    const { origin } = window.location;
    return callAuth(() =>
        authClient.signIn.social({
            provider: "google",
            callbackURL: `${origin}/dashboard`,
            errorCallbackURL: `${origin}/login`,
        }),
    );
}

export function sendLoginLink(email: string) {
    const { origin } = window.location;
    return callAuth(() =>
        authClient.signIn.magicLink({
            email,
            callbackURL: `${origin}/dashboard`,
            errorCallbackURL: `${origin}/login`,
        }),
    );
}

/** Emails the 6-digit code that verifies `email`. Also serves "Resend code". */
export function sendVerificationCode(email: string) {
    return callAuth(() =>
        authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        }),
    );
}
