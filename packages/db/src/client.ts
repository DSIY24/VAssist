import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./prisma/contract.d";
import contractJson from "./prisma/contract.json" with { type: "json" };

/**
 * Pins `sslmode` to `verify-full` in a Postgres connection string.
 *
 * Neon hands out `sslmode=require`. `pg` already treats `require`, `prefer`
 * and `verify-ca` as `verify-full`, but warns on every start that the next
 * major version will weaken them to libpq's meaning. Naming `verify-full`
 * keeps today's certificate checks and silences the warning. A URL that opts
 * into libpq semantics with `uselibpqcompat` is left alone.
 */
export function withVerifiedTls(url: string): string {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        // Not a URL `pg` will accept either: let it report the problem.
        return url;
    }
    const { searchParams } = parsed;
    if (searchParams.has("uselibpqcompat")) return url;
    const mode = searchParams.get("sslmode");
    if (mode !== "require" && mode !== "prefer" && mode !== "verify-ca") {
        return url;
    }
    searchParams.set("sslmode", "verify-full");
    return parsed.toString();
}

function create() {
    const url = process.env["DATABASE_URL"];
    if (!url) {
        throw new Error(
            "DATABASE_URL is not set. Add the pooled Neon connection string to the repo-root .env.local.",
        );
    }
    // pgvector is registered here (and in `prisma.config.ts`) once chunks land.
    return postgres<Contract>({ contractJson, url: withVerifiedTls(url) });
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
