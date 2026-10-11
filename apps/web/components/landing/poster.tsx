import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import lilyFront from "@/public/landing/lily-front.webp";
import lilyReveal from "@/public/landing/lily-reveal.webp";
import { BrandMark } from "@/components/brand-mark";
import { FlowerReveal } from "./flower-reveal";
import { PosterMenu } from "./poster-menu";
import { PosterStage } from "./poster-stage";

// `left`, `scale` and `delay` are literal class names so Tailwind can see them.
// The horizontal stretch is optical, so entrance animations never touch it.
const NAV_LINKS = [
    {
        label: "Home",
        href: "/",
        left: "left-[10.104167vw]",
        scale: "scale-x-[1.165]",
        delay: "[animation-delay:180ms]",
    },
    {
        label: "Knowledge",
        href: "#knowledge",
        left: "left-[17.526042vw]",
        scale: "scale-x-[1.052]",
        delay: "[animation-delay:225ms]",
    },
    {
        label: "Handoff",
        href: "#handoff",
        left: "left-[27.578125vw]",
        scale: "scale-x-[1.126]",
        delay: "[animation-delay:270ms]",
    },
    {
        label: "Widget",
        href: "#widget",
        left: "left-[36.171875vw]",
        scale: "scale-x-[1.168]",
        delay: "[animation-delay:315ms]",
    },
] as const;

const CTA = { label: "Get started", href: "/signup" } as const;

const CHROME_TEXT = "text-[clamp(13px,min(1.302083vw,2.05dvh),25px)]";
const CORNER_COPY =
    "absolute bottom-[4.361371dvh] z-3 text-[clamp(14px,min(1.40625vw,2.102804dvh),27px)] leading-[1.25] text-poster-copy tall:bottom-[max(3dvh,env(safe-area-inset-bottom))] tall:max-w-[42vw] tall:scale-x-100";
const CORNER_COPY_INNER =
    "block motion-safe:group-data-entering/stage:animate-poster-corner motion-safe:group-data-entering/stage:[animation-delay:980ms] motion-safe:compact:group-data-entering/stage:[animation-delay:860ms]";

export function Poster() {
    return (
        <main className="dark fixed inset-0 cursor-default overflow-hidden bg-poster font-sans text-poster-ink antialiased">
            <PosterStage>
                <Link
                    href="/"
                    aria-label="VAssist home"
                    className="absolute top-[2.141745dvh] left-[3.854167vw] z-4 w-[clamp(34px,min(3.4375vw,5.2dvh),66px)] rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:group-data-entering/stage:animate-poster-quiet motion-safe:group-data-entering/stage:[animation-delay:100ms] compact:top-[max(16px,env(safe-area-inset-top))] compact:left-4"
                >
                    <BrandMark />
                </Link>

                <nav
                    aria-label="Primary"
                    className="pointer-events-none absolute inset-0 z-4 compact:hidden"
                >
                    <ul>
                        {NAV_LINKS.map((link) => (
                            <li
                                key={link.href}
                                className={cn(
                                    "absolute top-[3.426791dvh] origin-left leading-none motion-safe:group-data-entering/stage:animate-poster-dim",
                                    CHROME_TEXT,
                                    link.left,
                                    link.scale,
                                    link.delay,
                                )}
                            >
                                <Link
                                    href={link.href}
                                    className="pointer-events-auto rounded-sm underline-offset-[0.3em] outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <Button
                    nativeButton={false}
                    render={<Link href={CTA.href} />}
                    className={cn(
                        "absolute top-[2.336449dvh] right-[7.5vw] z-4 h-[clamp(34px,4.439252dvh,57px)] rounded-full bg-poster-ink px-[1.35em] font-normal tracking-[0.026923em] text-poster hover:bg-poster-ink/85 motion-safe:group-data-entering/stage:animate-poster-quiet motion-safe:group-data-entering/stage:[animation-delay:340ms] compact:hidden",
                        CHROME_TEXT,
                    )}
                >
                    {CTA.label}
                </Button>

                <PosterMenu
                    links={NAV_LINKS}
                    cta={CTA}
                    className="absolute top-[max(12px,env(safe-area-inset-top))] right-4 z-12 hidden motion-safe:group-data-entering/stage:animate-poster-quiet motion-safe:group-data-entering/stage:[animation-delay:260ms] compact:inline-flex"
                />

                <h1
                    aria-label="VAssist"
                    className="absolute top-[11.565421dvh] left-[4.348958vw] z-1 font-display text-[min(35vw,62dvh)] leading-none tracking-[0.033708em] whitespace-nowrap tall:top-[12dvh] tall:text-[min(33vw,22dvh)] narrow:left-0 narrow:w-full narrow:text-center"
                >
                    <span
                        aria-hidden="true"
                        className="-mx-[0.08em] -my-[0.14em] block px-[0.08em] py-[0.14em] group-data-entering/stage:overflow-hidden"
                    >
                        <span className="block motion-safe:group-data-entering/stage:animate-poster-word motion-safe:group-data-entering/stage:[animation-delay:300ms] motion-safe:compact:group-data-entering/stage:[animation-delay:240ms]">
                            <span className="mr-[0.042135em] inline-block scale-x-[1.0866]">
                                V
                            </span>
                            <span className="inline-block bg-linear-to-b from-blossom-from to-blossom-to bg-clip-text text-transparent">
                                Assist
                            </span>
                        </span>
                    </span>
                </h1>

                <FlowerReveal
                    front={lilyFront}
                    reveal={lilyReveal}
                    alt="Pixel-art pink and violet lily"
                    className="absolute top-[14.749065dvh] left-[49.121328vw] z-2 h-[106.109034dvh] -translate-x-1/2 motion-safe:group-data-entering/stage:animate-poster-subject motion-safe:group-data-entering/stage:[animation-delay:660ms] motion-safe:compact:group-data-entering/stage:[animation-delay:560ms] tall:top-[27dvh] tall:left-1/2 tall:h-[min(55dvh,110vw)]"
                />

                <p
                    className={cn(
                        CORNER_COPY,
                        "left-[3.177083vw] origin-left scale-x-[1.073] tall:left-4",
                    )}
                >
                    <span className={CORNER_COPY_INNER}>
                        Support answers, grounded <br className="tall:hidden" />
                        in your knowledge base.
                    </span>
                </p>
                <p
                    className={cn(
                        CORNER_COPY,
                        "left-[78.28125vw] origin-left scale-x-[1.058] tall:right-4 tall:left-auto tall:text-right",
                    )}
                >
                    <span className={CORNER_COPY_INNER}>
                        No guessing. <br className="tall:hidden" />A clean
                        handoff to you.
                    </span>
                </p>
            </PosterStage>
        </main>
    );
}
