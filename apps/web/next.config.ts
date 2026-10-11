import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// The repo-root `.env.local` is the single source of env vars for every
// package. `loadEnvFile` never overrides a variable that is already set, so
// values injected by Vercel win, and a missing file (CI, Vercel) is fine.
const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const nextConfig: NextConfig = {
    /* config options here */
    // `next dev` only serves its client bundles to `localhost` by default. Opened
    // from any other address (127.0.0.1, or the LAN IP from a phone), the page
    // renders but never hydrates, so nothing interactive works.
    allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
    cacheComponents: true,
    partialPrefetching: true,
    // Workspace packages ship TypeScript source.
    transpilePackages: ["@vassist/db", "@vassist/shared"],
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

export default nextConfig;
