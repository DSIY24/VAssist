import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 66 62"
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="square"
            aria-hidden="true"
            className={cn("block h-auto w-full", className)}
        >
            <path d="M33 1v60M3 31h60M11.8 9.8l42.4 42.4M54.2 9.8 11.8 52.2" />
        </svg>
    );
}
