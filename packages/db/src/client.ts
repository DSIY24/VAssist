import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./prisma/contract.d";
import contractJson from "./prisma/contract.json" with { type: "json" };

function create() {
    const url = process.env["DATABASE_URL"];
    if (!url) {
        throw new Error(
            "DATABASE_URL is not set. Add the pooled Neon connection string to the repo-root .env.local.",
        );
    }
    // pgvector is registered here (and in `prisma.config.ts`) once chunks land.
    return postgres<Contract>({ contractJson, url });
}

type Db = ReturnType<typeof create>;

const globalForDb = globalThis as unknown as { __vassistDb?: Db };

/**
 * The one database client, shared by every app that imports `@vassist/db`.
 * Internal to this package: apps call the data-access functions instead.
 *
 * Created on first use, so importing the package never needs `DATABASE_URL`
 * (`next build` and `next typegen` import it without one). Kept on `globalThis`
 * so hot reloads in `next dev` reuse the pool instead of opening a new one.
 */
export function getDb(): Db {
    return (globalForDb.__vassistDb ??= create());
}
