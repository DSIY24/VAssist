import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireNoWorkspace } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Set up your workspace" };

// The gate reads the session, so it has to render inside `<Suspense>`.
async function FirstRunGate({ children }: { children: React.ReactNode }) {
    await requireNoWorkspace();
    return children;
}

export default function Page() {
    return (
        <AuthShell>
            <Suspense fallback={<FormSkeleton form="onboarding" />}>
                <FirstRunGate>
                    <OnboardingForm />
                </FirstRunGate>
            </Suspense>
        </AuthShell>
    );
}
