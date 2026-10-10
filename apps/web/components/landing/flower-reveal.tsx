"use client";

import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

const TRAIL_MAX_POINTS = 60;
const TRAIL_HEAD_R = 140;
const TRAIL_NOISE_AMP = 44;
const TRAIL_BLOB_PTS = 24;
const TRAIL_FADE_SPEED = 0.92;
const TRAIL_SAMPLE_DIST = 8;
// The trail is tuned per frame at 60 Hz, so faster displays skip frames.
const TRAIL_FRAME_MS = 1000 / 60;
// Canvases are drawn at device resolution, capped to keep large stages cheap.
const MAX_PIXEL_RATIO = 2;

const IMAGE_SIZES = "(max-aspect-ratio: 4/5) 110vw, 94vh";

type TrailPoint = {
    x: number;
    y: number;
    r: number;
    alpha: number;
    seed: number;
};

function drawMorphBlob(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    t: number,
    seed: number,
) {
    if (r < 2) return;

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < TRAIL_BLOB_PTS; i++) {
        const angle = (i / TRAIL_BLOB_PTS) * Math.PI * 2;
        const n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
        const n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.3;
        const n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
        const noise = (n1 + n2 + n3) * TRAIL_NOISE_AMP * (r / TRAIL_HEAD_R);
        xs.push(cx + Math.cos(angle) * (r + noise));
        ys.push(cy + Math.sin(angle) * (r + noise));
    }

    const last = TRAIL_BLOB_PTS - 1;
    ctx.beginPath();
    ctx.moveTo((xs[last] + xs[0]) / 2, (ys[last] + ys[0]) / 2);
    for (let i = 0; i < TRAIL_BLOB_PTS; i++) {
        const next = (i + 1) % TRAIL_BLOB_PTS;
        ctx.quadraticCurveTo(
            xs[i],
            ys[i],
            (xs[i] + xs[next]) / 2,
            (ys[i] + ys[next]) / 2,
        );
    }
    ctx.closePath();
    ctx.fill();
}

/** Draws an image the way `object-fit: cover` would lay it out. */
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
    const { width, height } = ctx.canvas;
    const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
    );
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
    );
}

/**
 * The poster's subject: two stacked images sharing one morphing mouse trail.
 * While the trail is alive the front image is swapped for two canvases: one
 * draws the front image with the trail's blobs punched out, the other draws
 * the reveal image inside the same blobs. Mouse events are read from the
 * enclosing `data-stage`.
 */
export function FlowerReveal({
    front,
    reveal,
    alt,
    className,
}: {
    front: StaticImageData;
    reveal: StaticImageData;
    alt: string;
    className?: string;
}) {
    const flowerRef = useRef<HTMLDivElement>(null);
    const frontImageRef = useRef<HTMLImageElement>(null);
    const revealImageRef = useRef<HTMLImageElement>(null);
    const frontCanvasRef = useRef<HTMLCanvasElement>(null);
    const revealCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const flower = flowerRef.current;
        const frontImage = frontImageRef.current;
        const revealImage = revealImageRef.current;
        const frontCanvas = frontCanvasRef.current;
        const revealCanvas = revealCanvasRef.current;
        const stage = flower?.closest<HTMLElement>("[data-stage]");
        const frontCtx = frontCanvas?.getContext("2d");
        const revealCtx = revealCanvas?.getContext("2d");
        if (
            !flower ||
            !frontImage ||
            !revealImage ||
            !frontCanvas ||
            !revealCanvas ||
            !stage ||
            !frontCtx ||
            !revealCtx
        )
            return;

        let points: TrailPoint[] = [];
        let headRadius = 0;
        let hovering = false;
        let time = 0;
        let frame = 0;
        let lastFrameAt = 0;
        let pixelRatio = 1;
        const mouse = { x: 0, y: 0 };
        let lastSample: { x: number; y: number } | null = null;

        const resize = () => {
            pixelRatio = Math.min(
                window.devicePixelRatio || 1,
                MAX_PIXEL_RATIO,
            );
            const width = Math.max(
                1,
                Math.round(flower.offsetWidth * pixelRatio),
            );
            const height = Math.max(
                1,
                Math.round(flower.offsetHeight * pixelRatio),
            );
            for (const canvas of [frontCanvas, revealCanvas]) {
                canvas.width = width;
                canvas.height = height;
            }
        };

        const loaded = (image: HTMLImageElement) =>
            image.complete && image.naturalWidth > 0;

        const drawTrail = (ctx: CanvasRenderingContext2D) => {
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            ctx.fillStyle = "#fff";
            for (const point of points) {
                ctx.globalAlpha = point.alpha;
                drawMorphBlob(ctx, point.x, point.y, point.r, time, point.seed);
            }
            ctx.globalAlpha = 1;
            drawMorphBlob(ctx, mouse.x, mouse.y, headRadius, time, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        };

        const reset = (ctx: CanvasRenderingContext2D) => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        };

        const stop = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            headRadius = 0;
            points = [];
            lastSample = null;
            frontImage.style.opacity = "";
            reset(frontCtx);
            reset(revealCtx);
        };

        const tick = (now: number) => {
            frame = requestAnimationFrame(tick);
            if (now - lastFrameAt < TRAIL_FRAME_MS - 2) return;
            lastFrameAt = now;

            const targetR = hovering ? TRAIL_HEAD_R : 0;
            headRadius += (targetR - headRadius) * (hovering ? 0.14 : 0.04);

            if (hovering && headRadius > 5) {
                const moved = lastSample
                    ? Math.hypot(mouse.x - lastSample.x, mouse.y - lastSample.y)
                    : Infinity;
                if (moved > TRAIL_SAMPLE_DIST) {
                    points.push({
                        x: mouse.x,
                        y: mouse.y,
                        r: headRadius,
                        alpha: 1,
                        seed: Math.random() * 100,
                    });
                    if (points.length > TRAIL_MAX_POINTS) points.shift();
                    lastSample = { x: mouse.x, y: mouse.y };
                }
            }

            points = points.filter((point) => {
                point.alpha *= TRAIL_FADE_SPEED;
                point.r *= 0.995;
                return point.alpha >= 0.01;
            });
            time += 0.016;

            if (!hovering && points.length === 0 && headRadius < 2) {
                stop();
                return;
            }
            // Until both images have decoded there is nothing to swap in.
            if (!loaded(frontImage) || !loaded(revealImage)) return;

            // Front: the image with the trail punched out of it.
            reset(frontCtx);
            drawCover(frontCtx, frontImage);
            frontCtx.globalCompositeOperation = "destination-out";
            drawTrail(frontCtx);

            // Reveal: the other image, kept only inside the trail.
            reset(revealCtx);
            drawTrail(revealCtx);
            revealCtx.globalCompositeOperation = "source-in";
            drawCover(revealCtx, revealImage);

            frontImage.style.opacity = "0";
        };

        const track = (event: MouseEvent) => {
            const rect = flower.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            mouse.x =
                (event.clientX - rect.left) * (flower.offsetWidth / rect.width);
            mouse.y =
                (event.clientY - rect.top) *
                (flower.offsetHeight / rect.height);
            hovering = true;
            if (!frame) frame = requestAnimationFrame(tick);
        };
        const leave = () => {
            hovering = false;
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(flower);
        stage.addEventListener("mousemove", track);
        stage.addEventListener("mouseenter", track);
        stage.addEventListener("mouseleave", leave);

        return () => {
            observer.disconnect();
            stage.removeEventListener("mousemove", track);
            stage.removeEventListener("mouseenter", track);
            stage.removeEventListener("mouseleave", leave);
            stop();
        };
    }, []);

    return (
        <div
            ref={flowerRef}
            className={cn("pointer-events-none", className)}
            style={{ aspectRatio: `${front.width} / ${front.height}` }}
        >
            <Image
                ref={frontImageRef}
                src={front}
                alt={alt}
                fill
                preload
                sizes={IMAGE_SIZES}
                className="object-cover"
            />
            {/* Never shown directly: it is the source the reveal canvas draws. */}
            <Image
                ref={revealImageRef}
                src={reveal}
                alt=""
                aria-hidden="true"
                fill
                loading="eager"
                sizes={IMAGE_SIZES}
                className="invisible object-cover"
            />
            <canvas
                ref={frontCanvasRef}
                aria-hidden="true"
                className="absolute inset-0 size-full"
            />
            <canvas
                ref={revealCanvasRef}
                aria-hidden="true"
                className="absolute inset-0 size-full"
            />
        </div>
    );
}
