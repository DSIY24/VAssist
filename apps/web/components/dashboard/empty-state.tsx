import type { LucideIcon } from "lucide-react";

/** A centered placeholder for a dashboard page that has nothing to show. */
export function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
                <h2 className="text-base font-medium">{title}</h2>
                <p className="text-sm text-balance text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}
