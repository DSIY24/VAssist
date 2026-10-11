import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { SignupForm } from "@/components/auth/signup-form";
import { redirectIfSignedIn } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign up" };

// The gate reads the session, so it has to render inside `<Suspense>`.
async function SignedOutGate({ children }: { children: React.ReactNode }) {
    await redirectIfSignedIn();
    return children;
}

export default function Page() {
    return (
        <AuthShell>
            <Suspense fallback={<FormSkeleton form="signup" />}>
                <SignedOutGate>
                    <SignupForm />
                </SignedOutGate>
            </Suspense>
        </AuthShell>
    );
}
