import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function Page() {
    return (
        <AuthShell>
            {/* The form reads the email from the query string. */}
            <Suspense fallback={<FormSkeleton form="reset" />}>
                <ResetPasswordForm />
            </Suspense>
        </AuthShell>
    );
}
