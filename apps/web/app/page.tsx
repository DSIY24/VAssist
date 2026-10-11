import type { Metadata, Viewport } from "next";
import { Poster } from "@/components/landing/poster";

export const metadata: Metadata = {
    title: "VAssist: support chat that knows its limits",
    description:
        "Paste one snippet and get a chat widget whose AI agent answers only from your knowledge base, and hands off to you instead of guessing.",
};

export const viewport: Viewport = {
    themeColor: "#161616",
    viewportFit: "cover",
};

export default function Home() {
    return <Poster />;
}
