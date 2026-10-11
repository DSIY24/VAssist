import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    // `next dev` only serves its client bundles to `localhost` by default. Opened
    // from any other address (127.0.0.1, or the LAN IP from a phone), the page
    // renders but never hydrates, so nothing interactive works.
    allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
    cacheComponents: true,
    partialPrefetching: true,
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
