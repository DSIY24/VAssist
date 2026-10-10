"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ENTRANCE_SAFETY_MS = 6000;

/**
 * The poster's stage. It carries `data-entering` while the one-time entrance
 * plays, and children key their entrance animations off it with
 * `group-data-entering/stage:`. Once the last animation ends the attribute is
 * dropped, so the entrance can never replay.
 */
export function PosterStage({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    const stageRef = useRef<HTMLElement>(null);
    const [entering, setEntering] = useState(true);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const finish = () => setEntering(false);
        const entrance = stage
            .getAnimations({ subtree: true })
            .filter(
                (animation) =>
                    animation instanceof CSSAnimation &&
                    animation.animationName.startsWith("poster-"),
            );
        void Promise.allSettled(
            entrance.map((animation) => animation.finished),
        ).then(finish);
        const safety = window.setTimeout(finish, ENTRANCE_SAFETY_MS);

        return () => window.clearTimeout(safety);
    }, []);

    return (
        <section
            ref={stageRef}
            data-stage=""
            data-entering={entering ? "" : undefined}
            className={cn(
                "group/stage absolute inset-0 isolate contain-strict motion-reduce:data-entering:animate-poster-fade",
                className,
            )}
        >
            {children}
        </section>
    );
}
