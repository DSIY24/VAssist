import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { withVerifiedTls } from "./src/client.ts";

// The repo-root `.env.local` is the single source of env vars. The Prisma CLI
// does not read env files itself. `loadEnvFile` never overrides a variable
// that is already set, so CI and shell values win.
const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const unpooledUrl = process.env["DATABASE_URL_UNPOOLED"];

export default definePrismaConfig({
    parent: false,
    orm: ormConfig({
        contract: "./src/prisma/contract.prisma",
        migrations: { dir: "./migrations" },
        // The CLI migrates over the direct (unpooled) connection; the runtime
        // client in `src/client.ts` uses the pooled `DATABASE_URL`. Left
        // undefined when unset so the offline commands (`contract emit`,
        // `migration plan`, `migration show`, `migration check`) still run.
        db: {
            connection: unpooledUrl && withVerifiedTls(unpooledUrl),
        },
        // pgvector is registered here (and in `src/client.ts`) once chunks land:
        // extensions: [pgvector] from "@prisma/orm-extension-pgvector".
    }),
});
