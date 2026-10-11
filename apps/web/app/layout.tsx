import type { Metadata } from "next";
import "./globals.css";
import { Geist, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-display",
});

export const metadata: Metadata = {
    title: { default: "VAssist", template: "%s · VAssist" },
    description:
        "Customer support chat with an AI agent grounded in your own knowledge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            // The theme script sets `class` and `color-scheme` on this element
            // before React hydrates it.
            suppressHydrationWarning
            className={cn(
                "font-sans",
                geist.variable,
                instrumentSerif.variable,
            )}
        >
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Providers>{children}</Providers>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
