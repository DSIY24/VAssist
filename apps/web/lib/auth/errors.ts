/** What went wrong with a browser auth call, whichever way it was reported. */
export type AuthFailure = {
    code?: string;
    status?: number;
    message: string;
};

export type AuthResult<T> =
    { data: T; error?: undefined } | { data?: undefined; error: AuthFailure };

export type AuthErrorKind =
    | "invalid_credentials"
    | "email_not_confirmed"
    | "invalid_code"
    | "expired_code"
    | "too_many_attempts"
    | "rate_limited"
    | "weak_password"
    | "network"
    | "unknown";

function toFailure(error: unknown): AuthFailure {
    if (typeof error !== "object" || error === null) {
        return { message: typeof error === "string" ? error : "" };
    }
    const { code, status, message } = error as Record<string, unknown>;
    // A rejected `fetch` (offline, DNS, aborted) is a `TypeError` with no
    // status. Anything the auth server answered carries one.
    const isNetwork = error instanceof TypeError && typeof status !== "number";
    return {
        code: isNetwork
            ? "network"
            : typeof code === "string"
              ? code.toLowerCase()
              : undefined,
        status: typeof status === "number" ? status : undefined,
        message: typeof message === "string" ? message : "",
    };
}

/**
 * Runs one browser auth call and reports its outcome one way.
 *
 * `createAuthClient()` from `@neondatabase/auth/next` is Better Auth's React
 * client behind Neon's adapter core (not the Supabase-style adapter). Its types
 * promise `{ data, error }`, but the core's fetch throws for a non-2xx
 * response: an error with `.status`, `.message` and a snake_case `.code` from
 * Neon's own list. A Better Auth code the core knows is translated
 * (`INVALID_EMAIL_OR_PASSWORD` becomes `invalid_credentials`) and the message
 * replaced; one it does not know gets a code picked from the HTTP status
 * (`validation_failed` for a 400 or 422) and keeps the server's message. A
 * request that never got an answer rejects with a `TypeError`. All of them end
 * up as `{ error }` here, with `code` lowercased.
 */
export async function callAuth<T>(
    call: () => Promise<{ data: T | null; error?: unknown }>,
): Promise<AuthResult<T>> {
    try {
        const result = await call();
        if (result.error) return { error: toFailure(result.error) };
        return { data: result.data as T };
    } catch (error) {
        return { error: toFailure(error) };
    }
}

/** Sorts a failure into the cases the forms have copy for. */
export function authErrorKind(error: AuthFailure): AuthErrorKind {
    const code = error.code ?? "";
    const message = error.message.toLowerCase();

    if (code === "network") return "network";
    if (error.status === 429 || code.includes("rate_limit")) {
        return "rate_limited";
    }
    // The code endpoints report these three in the message text only: their
    // Better Auth codes are not ones the adapter translates, so all three
    // arrive as `validation_failed` with the server's message.
    if (message.includes("too many attempts")) return "too_many_attempts";
    if (message.includes("otp expired")) return "expired_code";
    if (message.includes("invalid otp")) return "invalid_code";
    if (code === "email_not_confirmed" || code === "email_not_verified") {
        return "email_not_confirmed";
    }
    if (
        code === "invalid_credentials" ||
        code === "invalid_email_or_password" ||
        code === "invalid_password"
    ) {
        return "invalid_credentials";
    }
    if (
        code === "weak_password" ||
        code === "password_too_short" ||
        code === "password_too_long"
    ) {
        return "weak_password";
    }
    return "unknown";
}

/**
 * True when a "send me an email" request did not go through: no answer, a
 * rate limit, or a server error. Every other answer (a 4xx) is treated like a
 * success by the forms that must not reveal whether an address has an account.
 */
export function sendFailed(error: AuthFailure): boolean {
    const { status } = error;
    const refused = status !== undefined && status >= 400 && status < 500;
    return !refused || authErrorKind(error) === "rate_limited";
}

const messages: Record<AuthErrorKind, string> = {
    invalid_credentials: "Incorrect email or password.",
    email_not_confirmed: "Verify your email to continue.",
    invalid_code: "That code is incorrect.",
    expired_code: "That code has expired. Request a new one.",
    too_many_attempts: "Too many attempts. Request a new code.",
    rate_limited: "Too many requests. Wait a moment and try again.",
    weak_password: "Choose a stronger password of at least 8 characters.",
    network: "Couldn't reach the server. Check your connection and try again.",
    unknown: "Something went wrong. Try again.",
};

/** Our own copy for a failure. Upstream messages are never shown. */
export function authErrorMessage(error: AuthFailure): string {
    return messages[authErrorKind(error)];
}
