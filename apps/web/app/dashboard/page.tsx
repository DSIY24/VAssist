import { Suspense } from "react";
import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { HomeView } from "@/components/home/home-view";
import { orpc } from "@/lib/orpc/client";
import { serverClient } from "@/lib/orpc/server";
import { getServerQueryClient } from "@/lib/query/server";

export const metadata: Metadata = { title: "Home" };

// Reads the session through the procedures, so it renders inside `<Suspense>`.
// `orpc` only builds the query keys here; the calls go through `serverClient`.
async function HomeData() {
    const queryClient = getServerQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: orpc.widget.getSettings.queryKey(),
            queryFn: () => serverClient.widget.getSettings(),
        }),
        queryClient.prefetchQuery({
            queryKey: orpc.knowledge.listSources.queryKey(),
            queryFn: () => serverClient.knowledge.listSources(),
        }),
    ]);
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <HomeView />
        </HydrationBoundary>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={<HomeSkeleton />}>
            <HomeData />
        </Suspense>
    );
}
