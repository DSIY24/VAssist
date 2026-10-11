import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    prettier,
    {
        settings: {
            next: {
                rootDir: "apps/web",
            },
        },
    },
    globalIgnores([
        "**/node_modules/**",
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/dist/**",
        "**/next-env.d.ts",
        "apps/web/public/embed.js",
    ]),
]);

export default eslintConfig;
