import "server-only";
import { cache } from "react";
import { makeQueryClient } from "./client";

/**
 * One query client per request, for Server Components that prefetch through
 * `serverClient` and hand the result to the browser with `HydrationBoundary`.
 */
export const getServerQueryClient = cache(makeQueryClient);
