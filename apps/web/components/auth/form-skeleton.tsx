import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Each skeleton mirrors its form row for row, with the same gaps and the same
// line heights (`h-lh` is one line of the text style beside it), so the
// centred column does not move when the form replaces it. When a form gains
// or loses a row, change its skeleton here too.

/** One line of text: as tall as the line, with a shorter bar inside it. */
function Line({ className, bar }: { className?: string; bar: string }) {
    return (
        <div className={cn("flex h-lh items-center text-sm", className)}>
            <Skeleton className={cn("h-3.5", bar)} />
        </div>
    );
}

/** `AuthHeader`: the heading and the muted copy under it. */
function Header({ titleLines = 1, copyLines = 1 }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="flex flex-col items-center">
                {Array.from({ length: titleLines }, (_, index) => (
                    <div
                        key={index}
                        className="flex h-lh items-center text-2xl"
                    >
                        <Skeleton className="h-6 w-44" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-center">
                {Array.from({ length: copyLines }, (_, index) => (
                    <Line key={index} bar="w-56" />
                ))}
            </div>
        </div>
    );
}

/** A `Field`: label, control and the hint lines under it. */
function FieldRows({ control = "h-8", hintLines = 0 }) {
    return (
        <div className="flex flex-col gap-2">
            <Line className="leading-snug" bar="w-20" />
            <Skeleton className={cn("w-full", control)} />
            {hintLines > 0 ? (
                <div>
                    {Array.from({ length: hintLines }, (_, index) => (
                        <Line
                            key={index}
                            className="leading-normal"
                            bar={index === 0 ? "w-48" : "w-32"}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function ButtonRow({ className }: { className?: string }) {
    return <Skeleton className={cn("h-8 w-full", className)} />;
}

/** The "or" separator, the Google button and the line under the form. */
function GoogleAndFooter() {
    return (
        <>
            <div className="-my-2 flex h-5 items-center">
                <Skeleton className="h-px w-full" />
            </div>
            <ButtonRow />
            <Line className="justify-center" bar="w-52" />
        </>
    );
}

const forms = {
    login: (
        <>
            <Header />
            <FieldRows />
            <FieldRows />
            <div className="flex flex-col gap-2">
                <ButtonRow />
                <ButtonRow />
            </div>
            <GoogleAndFooter />
        </>
    ),
    signup: (
        <>
            <Header />
            <FieldRows />
            <FieldRows />
            <FieldRows hintLines={1} />
            <ButtonRow />
            <GoogleAndFooter />
        </>
    ),
    reset: (
        <>
            <Header copyLines={2} />
            <FieldRows control="h-10" />
            <FieldRows hintLines={1} />
            <ButtonRow />
            <div className="flex flex-col items-center gap-1">
                <ButtonRow className="w-24" />
                <Line bar="w-36" />
            </div>
        </>
    ),
    onboarding: (
        <>
            <Header titleLines={2} />
            <FieldRows hintLines={2} />
            <ButtonRow />
            <ButtonRow className="mx-auto w-16" />
        </>
    ),
};

/** The fallback shown while a page's gate reads the session. */
export function FormSkeleton({ form }: { form: keyof typeof forms }) {
    return (
        <div aria-hidden="true" className="flex flex-col gap-5">
            {forms[form]}
        </div>
    );
}
