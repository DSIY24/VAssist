import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { redirectIfSignedIn } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Log in" };

// The gate reads the session, so it has to render inside `<Suspense>`.
async function SignedOutGate({ children }: { children: React.ReactNode }) {
    await redirectIfSignedIn();
    return children;
}

export default function Page() {
    return (
        <AuthShell>
            <Suspense fallback={<FormSkeleton form="login" />}>
                <SignedOutGate>
                    <LoginForm />
                </SignedOutGate>
            </Suspense>
        </AuthShell>
    );
}
