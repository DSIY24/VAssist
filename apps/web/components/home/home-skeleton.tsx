import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows }: { rows: number }) {
    return (
        <div className="rounded-xl border bg-card">
            <div className="flex flex-col gap-2 border-b p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="flex flex-col gap-4 p-4">
                {Array.from({ length: rows }, (_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                ))}
            </div>
        </div>
    );
}

/** The frame of the Home page while its data loads. Fixed sizes only. */
export function HomeSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="flex flex-1 flex-col lg:flex-row"
        >
            <span className="sr-only">Loading your settings</span>
            <div
                aria-hidden="true"
                className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6"
            >
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <SectionSkeleton rows={3} />
                <SectionSkeleton rows={4} />
                <SectionSkeleton rows={2} />
            </div>
            <div
                aria-hidden="true"
                className="hidden w-[38%] max-w-md shrink-0 border-l p-6 lg:block"
            >
                <Skeleton className="h-[min(40rem,80svh)] w-full rounded-xl" />
            </div>
        </div>
    );
}
