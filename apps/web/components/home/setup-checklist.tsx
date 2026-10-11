import { CircleCheckIcon, CircleIcon } from "lucide-react";

export type SetupStep = {
    title: string;
    description: string;
    /** The section of the page where the step is done. */
    href: string;
    done: boolean;
};

/**
 * The three steps to a working widget (PRD D-10). Each links to the section
 * that completes it; the checklist goes away once all three are done.
 */
export function SetupChecklist({ steps }: { steps: readonly SetupStep[] }) {
    const done = steps.filter((step) => step.done).length;
    if (done === steps.length) return null;

    return (
        <section
            aria-labelledby="setup-title"
            className="rounded-xl border bg-card text-card-foreground"
        >
            <div className="flex items-baseline justify-between gap-4 border-b p-4">
                <h2 id="setup-title" className="text-base font-medium">
                    Get set up
                </h2>
                <p className="text-sm text-muted-foreground tabular-nums">
                    {done} of {steps.length} done
                </p>
            </div>
            <ol className="flex flex-col divide-y">
                {steps.map((step) => (
                    <li key={step.href}>
                        <a
                            href={step.href}
                            className="flex items-start gap-3 p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                        >
                            {step.done ? (
                                <CircleCheckIcon
                                    aria-hidden="true"
                                    className="mt-0.5 size-4 shrink-0 text-foreground"
                                />
                            ) : (
                                <CircleIcon
                                    aria-hidden="true"
                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                />
                            )}
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-sm font-medium">
                                    {step.title}
                                    <span className="sr-only">
                                        {step.done ? " (done)" : " (not done)"}
                                    </span>
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {step.description}
                                </span>
                            </span>
                        </a>
                    </li>
                ))}
            </ol>
        </section>
    );
}
