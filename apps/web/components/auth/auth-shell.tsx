import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ModeToggle } from "@/components/mode-toggle";
import lilyFront from "@/public/landing/lily-front.webp";

/**
 * The frame every auth page shares: the form column on the left and the
 * poster cover on the right from `lg` up.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <header className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-sm text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <BrandMark className="w-5" />
                        VAssist
                    </Link>
                    <ModeToggle />
                </header>
                <main className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">{children}</div>
                </main>
            </div>
            <AuthCover />
        </div>
    );
}

/**
 * The landing poster in miniature, static and decorative. `--cover` is the
 * width of the lily: the wordmark is sized and placed from it, so the two keep
 * their overlap at any panel shape, and the stem always leaves the bottom edge.
 */
function AuthCover() {
    return (
        <div
            aria-hidden="true"
            className="dark relative hidden overflow-hidden bg-poster text-poster-ink [--cover:min(50vw,86svh)] lg:block"
        >
            <div className="absolute bottom-0 left-1/2 w-(--cover) -translate-x-1/2 translate-y-[12%]">
                <p className="absolute inset-x-0 top-[calc(var(--cover)*-0.0875)] text-center font-display text-[calc(var(--cover)*0.31)] leading-none tracking-[0.033708em] whitespace-nowrap">
                    <span className="mr-[0.042135em] inline-block scale-x-[1.0866]">
                        V
                    </span>
                    <span className="inline-block bg-linear-to-b from-blossom-from to-blossom-to bg-clip-text text-transparent">
                        Assist
                    </span>
                </p>
                <Image
                    src={lilyFront}
                    alt=""
                    sizes="(min-width: 1024px) 50vw, 0px"
                    loading="eager"
                    className="relative h-auto w-full"
                />
            </div>
        </div>
    );
}
