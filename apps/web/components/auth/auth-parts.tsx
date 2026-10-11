import Link from "next/link";
import { cn } from "@/lib/utils";

// A stable ref callback, so it runs once, when the heading mounts.
function focusNode(node: HTMLElement | null) {
    node?.focus();
}

/**
 * The heading and the line under it at the top of every auth form.
 *
 * `focusOnMount` moves focus to the heading: set it on a view the person
 * reached by an action on the page (a step change), never on first load.
 * `status` makes the line a live region, for a view that confirms something.
 */
export function AuthHeader({
    title,
    children,
    focusOnMount = false,
    status = false,
}: {
    title: string;
    children?: React.ReactNode;
    focusOnMount?: boolean;
    status?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1 text-center">
            {/* Focusable from code only, so it takes no focus ring. */}
            <h1
                ref={focusOnMount ? focusNode : undefined}
                tabIndex={-1}
                className="text-2xl font-bold text-balance outline-none"
            >
                {title}
            </h1>
            {children ? (
                <p
                    role={status ? "status" : undefined}
                    className="text-sm text-pretty text-muted-foreground"
                >
                    {children}
                </p>
            ) : null}
        </div>
    );
}

/** An email address inside a sentence. Long ones wrap instead of overflowing. */
export function Email({ children }: { children: string }) {
    return (
        <span className="font-medium wrap-anywhere text-foreground">
            {children}
        </span>
    );
}

/** A plain text link with the shared focus ring. */
export function AuthLink({
    className,
    ...props
}: React.ComponentProps<typeof Link>) {
    return (
        <Link
            className={cn(
                "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                className,
            )}
            {...props}
        />
    );
}

/** A quiet message above a form: a confirmation or a pointer, not an error. */
export function FormNotice({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            role="status"
            className={cn(
                "rounded-lg border border-border bg-muted px-3 py-2 text-sm text-pretty text-foreground",
                className,
            )}
            {...props}
        />
    );
}

/** The line under a form that points to the other auth page. */
export function AuthFooter({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-center text-sm text-muted-foreground">{children}</p>
    );
}
