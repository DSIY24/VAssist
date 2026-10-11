import * as z from "zod";

/**
 * The owner auth forms. Neon Auth validates again on its side: these schemas
 * give the forms their messages and stop requests that could never succeed.
 */

export const emailSchema = z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(254, "Enter a valid email address.")
    .pipe(z.email("Enter a valid email address."));

/** A new password, at sign-up and at password reset. */
export const newPasswordSchema = z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Use 128 characters or fewer.");

/** The 6-digit code emailed to verify an address or reset a password. */
export const verificationCodeSchema = z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code.");

export const emailInputSchema = z.object({ email: emailSchema });
export type EmailInput = z.infer<typeof emailInputSchema>;

export const loginInputSchema = z.object({
    email: emailSchema,
    // The same length rule as a new password: every account was created
    // under it, so anything shorter could never log in.
    password: z
        .string()
        .min(1, "Enter your password.")
        .min(8, "Passwords have at least 8 characters.")
        .max(128, "Use 128 characters or fewer."),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const signupInputSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Enter your name.")
        .max(80, "Use 80 characters or fewer."),
    email: emailSchema,
    password: newPasswordSchema,
});
export type SignupInput = z.infer<typeof signupInputSchema>;

export const resetPasswordInputSchema = z.object({
    code: verificationCodeSchema,
    password: newPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
