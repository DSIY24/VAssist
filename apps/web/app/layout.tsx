import type { Metadata } from "next";
import "./globals.css";
import { Geist, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-display",
});

export const metadata: Metadata = {
    title: "VAssist",
    description:
        "Customer support chat with an AI agent grounded in your own knowledge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={cn(
                "font-sans",
                geist.variable,
                instrumentSerif.variable,
            )}
        >
            <body>{children}</body>
        </html>
    );
}
