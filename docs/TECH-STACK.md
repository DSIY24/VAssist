# VAssist: Technology stack (v1)

> **For coding agents:** this is the source of truth for _how_ VAssist is built. [`PRD.md`](./PRD.md) defines _what_ it does, and [`CONTEXT.md`](../CONTEXT.md) defines the vocabulary. Read all three before implementing anything. Several libraries here are pinned to pre-release or recently released versions, and your training data describes older versions, so **fetch the linked docs instead of relying on memory** (see "Versions and documentation sources").

|                |                                                     |
| -------------- | --------------------------------------------------- |
| Status         | Agreed (Sep 26, 2026)                               |
| Companion docs | [`PRD.md`](./PRD.md), [`CONTEXT.md`](../CONTEXT.md) |

---

## 1. Overview

| Layer                              | Choice                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| App framework (frontend + backend) | Next.js 16, App Router, no `src/` directory                                                     |
| Language                           | TypeScript, strict mode                                                                         |
| UI                                 | Tailwind CSS + shadcn/ui                                                                        |
| Forms and validation               | React Hook Form + Zod                                                                           |
| API                                | oRPC v2 (beta), contract-first, served as both RPC and OpenAPI                                  |
| Data fetching and mutations        | TanStack Query (via `@orpc/tanstack-query`), prefetched in server components                    |
| Database access                    | Prisma 8 (release candidate), server-side only                                                  |
| Database                           | Neon Postgres + pgvector                                                                        |
| Auth                               | Neon Auth (Managed Better Auth)                                                                 |
| Real time                          | PartyKit, now Cloudflare PartyServer (`partyserver` + `partysocket`)                            |
| AI                                 | Vercel AI SDK 7 + Neon AI Gateway (`@neon/ai-sdk-provider` for chat, Qwen3 embeddings)          |
| Background work                    | Neon Functions (storage trigger + schedule trigger)                                             |
| File storage                       | Neon Object Storage                                                                             |
| Markdown rendering                 | Streamdown                                                                                      |
| Avatars                            | DiceBear                                                                                        |
| Hosting                            | Vercel (web app), Cloudflare (real-time), Neon (database, auth, functions, storage, AI gateway) |
| Package manager and repo           | pnpm workspaces (no Turborepo)                                                                  |
| Linting and formatting             | ESLint (flat config) + Prettier                                                                 |

**Explicitly not used:** Neon Data API, row-level security, server actions, Drizzle, Biome, Turborepo, LangChain, Vercel or Neon WebSockets, client-side database access.

---

## 2. Repository layout

A pnpm workspace with three deployable apps and shared packages:

```
/
├── apps/
│   ├── web/          # Next.js 16: dashboard, widget iframe page, oRPC handlers, agent orchestration  → Vercel
│   ├── realtime/     # PartyServer on Cloudflare Workers + Durable Objects                            → Cloudflare
│   └── functions/    # Neon Functions: ingest, suggested questions, auto-close                        → Neon
├── packages/
│   ├── db/           # Prisma 8 schema, migrations, generated client, workspace-scoped data access
│   └── shared/       # oRPC contract, Zod schemas, real-time event types, shared constants
├── docs/             # PRD.md, TECH-STACK.md, DESIGN.md
└── CONTEXT.md
```

**Environment.** One `.env.local` at the repo root is the single local source, because that is where `neon link` and `neon env pull` write. `apps/web/next.config.ts` and `packages/db/prisma.config.ts` each load it with a guarded `process.loadEnvFile`, which never overrides a variable that is already set, so values injected by Vercel or Neon win. [`.env.example`](../.env.example) lists the names. `NEON_AUTH_COOKIE_SECRET` is not issued by Neon: generate it with `openssl rand -base64 32`.

The widget's embed script (the small loader a customer pastes into their site) lives in `apps/web/embed/` but has its own tiny build, separate from Next.js: **esbuild** bundles it to `apps/web/public/embed.js` (git-ignored, rebuilt by `dev` and `build`), served with a five-minute cache under a stable filename.

**Snippet.** The snippet an owner pastes, one attribute per line, is built by `buildSnippet` in `packages/shared/src/widget.ts`, and nowhere else:

```html
<script
    src="{app origin}/embed.js"
    data-workspace="{workspace id}"
    async
></script>
```

The embed script finds its own `<script>` tag and reads the workspace from `data-workspace`; position and color come from the workspace's settings, not from the tag, so changing them never means pasting a new snippet. The app origin is `NEXT_PUBLIC_APP_URL` when set (production) and the dashboard's own origin otherwise (development). The embed script and the widget route are not built yet, so the snippet currently loads nothing.

---

## 3. Frontend

- **Next.js 16 App Router**, no `src/` directory. Server components by default. Client components only where interactivity needs them.
- **No server actions.** Every read and write goes through oRPC procedures.
- **Tailwind CSS + shadcn/ui** for the dashboard _and_ the widget: one design system. **`next-themes`** switches the dashboard and auth pages between light and dark (DESIGN section 2).
- **React Hook Form + Zod** for dashboard forms. Zod schemas come from `packages/shared` so forms and API inputs validate identically.
- **Streamdown** renders Markdown in messages. It's built for streaming AI text, so partially streamed agent replies render cleanly.
- **Widget:** the chat UI is a Next.js route (for example `/widget/[workspaceId]`) loaded in an iframe. The embed script is a tiny vanilla TypeScript bundle that injects the launcher bubble and the iframe into the customer's page, and passes position and color settings.
- **Dashboard widget settings** use the split layout from the PRD (settings on the left, a live widget preview on the right). The preview renders the real widget components. They live on the Home page (`components/home/`), with the knowledge base and the snippet (PRD 7.4, "Dashboard pages").
- **Widget components** are in `apps/web/components/widget/`: presentational, with settings and messages in as props and callbacks out, and no data access, so the widget route and the preview share them. They exist; the route that feeds them a conversation does not yet.
- **Widget settings save themselves** (`widget.updateSettings`, a partial update): one request at a time, later changes merged and sent next, a failed change kept and retried (`components/home/use-autosave.ts`). The form is filled once from `widget.getSettings` and never reset from a response, so a save landing mid-typing can't overwrite the field.

---

## 4. API layer: oRPC v2 + TanStack Query

### Contract-first

1. Define the API as an **oRPC contract** (`@orpc/contract`) in `packages/shared`. Inputs, outputs and errors use Zod, and every procedure carries OpenAPI route metadata.
2. **Implement** the contract in `apps/web` with `implement(contract)`.
3. Serve the same implementation through **two handlers**:
    - `RPCHandler` for the app's own clients (dashboard and widget), at `/rpc` (`app/rpc/[[...rest]]/route.ts`)
    - `OpenAPIHandler` for REST access and the generated OpenAPI 3.1 spec, at `/api/v1` (`app/api/v1/[[...rest]]/route.ts`, spec at `/api/v1/spec.json`). It is not mounted at `/api`, which would collide with the auth route below

**The one endpoint that is not oRPC** is `app/api/auth/[...path]/route.ts`, the Neon Auth proxy (section 6). It is a documented exception to "one API": the browser auth client and Neon's OAuth and email callbacks need it at that path.

oRPC v2 specifics, which differ from v1: route metadata is `oc.meta(openapi({ method, path, tags, summary }))` from `@orpc/openapi` (there is no `.route()`); `.errors()` takes no `status`, and HTTP statuses come from the handlers' `errorStatusMap` (`UNAUTHORIZED` 401 and `FORBIDDEN` 403 by default); the typed client is `RouterContractClient<Contract>`; middleware is not deduplicated, so a procedure is built from exactly one base.

### Base procedures and middleware

| Base               | Used by            | Middleware adds to context                                                                                        |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `sessionProcedure` | The first-run step | Verifies the Neon Auth session and that the email is verified, and adds `user`. No workspace yet                  |
| `ownerProcedure`   | Dashboard          | Everything `sessionProcedure` does, then loads the owner's membership and adds `workspaceId`                      |
| `visitorProcedure` | Widget             | Verifies the visitor token (checked against the workspace's allowed domains) and adds `visitor` and `workspaceId` |

Both owner bases live in `apps/web/server/orpc.ts`. Without a session they throw `UNAUTHORIZED`; `ownerProcedure` throws `FORBIDDEN` when the person has no workspace. Only `workspace.get` and `workspace.create` use `sessionProcedure`; everything after the first-run step uses `ownerProcedure`. The procedures refuse an unauthenticated caller on their own, independent of the page redirects in section 6.

Errors are typed with the contract's `errors` definitions and thrown as `ORPCError`.

### TanStack Query

- **Server:** server components call procedures directly, in the same process with no HTTP (`serverClient` in `lib/orpc/server.ts`, made with `createRouterClient`), to **prefetch** into a TanStack Query client (`getServerQueryClient` in `lib/query/server.ts`), then hand the data to the browser with `HydrationBoundary`. Follow oRPC's documented TanStack Query and SSR setup; don't invent one.
- **Client:** `client` and `orpc` in `lib/orpc/client.ts` (`RPCLink` to `/rpc`, `createTanstackQueryUtils`) for `useQuery` and `useMutation`. The provider is mounted in the root layout (`components/providers.tsx`).
- **One query client shape.** `lib/query/client.ts` builds the server and browser clients with the same `RPCJsonSerializer`-based `queryKeyHashFn`, `dehydrate` and `hydrate` settings. They must stay identical, or hydrated data is not found.
- **Real-time updates:** PartyKit events write directly into the TanStack Query cache (append a message, update a conversation's state) instead of triggering refetches.
- **Inbox queries** (`components/inbox/queries.ts`). One place builds the options for the conversation list (an infinite query per filter), the counts, a conversation and its messages. `applyConversationChange` writes the result of a reply or a state change into those caches. The server prefetches with the same keys in `components/inbox/prefetch.ts`, but with fetchers that call `serverClient`, because the `orpc` helpers' own fetchers go through the browser client. Until the rooms exist the inbox has no live delivery: `INBOX_REFRESH` in `queries.ts` refetches every 15 seconds and on window focus, and is the one thing the real-time work replaces. Each write handler in `server/conversations.ts` marks where its publish goes.
- **Dehydrate only what has settled.** The inbox layout and the conversation page share the per-request query client and prefetch at the same time, and the client's default also dehydrates pending queries. `dehydrateSettled` (`prefetch.ts`) hands over successful queries only; without it the layout passes on the page's half-done queries and the browser waits on them without the page's options.
- **Custom error statuses.** `NOT_FOUND` (404) and `CONFLICT` (409) are in oRPC's default status map, so the handlers need no `errorStatusMap`. The conversation writes answer `CONFLICT` with the current state as data when the conversation is no longer in a state the action starts from.

---

## 5. Data: Prisma 8 + Neon Postgres

- **Prisma 8 (release candidate)** is used for its native, typed pgvector support (`@prisma/orm-extension-pgvector`): `vector(N)` columns and typed `cosineDistance` / `cosineSimilarity` queries. Prisma 8 requires Node.js 24+, which Vercel and Neon Functions both provide.
- **Fallback:** if Prisma 8 proves unstable, drop to **Prisma 7.10** (stable), with the vector column as `Unsupported("vector")` and the two vector operations (saving chunk embeddings, similarity search) as raw SQL. The change is contained in `packages/db`.
- **`packages/db`** owns the schema, migrations, the generated client, and all data-access functions. `apps/web` and `apps/functions` import from it and never create their own clients. It exports functions only; the client (`getDb()` in `src/client.ts`, created on first use) stays internal.
- **Layout.** Install the facade `@prisma/orm-postgres` (it brings the Postgres target and `pg`), with the `prisma` CLI. The schema is `src/prisma/contract.prisma` (first line `// use prisma-8`, no `generator` or `datasource`); `prisma contract emit` writes `contract.json` and `contract.d.ts` next to it, and both are committed. Emitted files and `migrations/` are excluded from Prettier and ESLint, because migrations are hash-attested.
- **Migrations** run against the Neon `development` branch first, then `production`. From `packages/db`: `pnpm db:plan --name <slug>` (offline: emits the contract and plans from the last snapshot), `pnpm db:show <dir> --format human` to read the SQL, then `pnpm db:migrate --advance-ref db` to apply to the branch in the root `.env.local` (the CLI uses `DATABASE_URL_UNPOOLED`), and `pnpm db:verify`. For any other branch pass `--db <url>` and leave the ref alone. There is no `migrate dev`, `db push`, `generate` or shadow database in Prisma 8. Don't use `db update` or `db init`, which diff the live database.
- **`neon_auth` is Neon's.** The contract declares only `public`, and Prisma's planner and introspection are scoped to the schemas the contract declares, so migrations never touch `neon_auth`. Never declare that schema or a relation into it. `members.user_id` is a plain `uuid` column holding `neon_auth.user.id`. Prisma keeps its own bookkeeping in a `prisma_contract` schema.
- **Workspaces and members.** `workspaces` (id, name, timestamps) and `members` (workspace, user, `role` as text, `owner` only in v1). `members.user_id` is unique, which is what enforces one workspace per owner. `getMembershipByUserId` is the single place a `workspaceId` is derived from a user id. `createWorkspaceForOwner` creates the workspace and the membership in one transaction under a per-user advisory lock and returns the existing workspace on a repeat call.
- **Timestamps** use the `*String` column types, because Node 24 has no global `Temporal`. `updated_at` has a database default only, so an update has to set it.
- **Server-side only.** The browser never talks to the database.
- **Tenant isolation, with no row-level security:** every data-access function that reads or writes workspace data takes `workspaceId` as a required argument and filters on it. `workspaceId` only ever comes from the procedure context (the session or visitor token), never from client input. Vector search filters by `workspaceId` before ranking.
- **Conversations** (`src/conversations.ts`). The inbox list is raw SQL (`db.raw.sql`), because it orders by an expression (`waiting` first, then newest message) and joins each row's newest message; it pages by keyset on `(waiting, last_message_at, id)`, with the cursor carrying `last_message_at::text` so no microseconds are lost. Replying, taking over, handing back and closing all go through one helper that locks the conversation row (`FOR NO KEY UPDATE`), checks the state, and writes the messages and the new state in one transaction; a change from the wrong state writes nothing and reports the current state. Timestamps come back from Prisma in Postgres's text form, so the module converts everything it returns to ISO 8601. The owner taking over writes a `take_over` system message for the visitor ("{name} joined the conversation.", or "A person joined…" when the account has no name; never the email).
- **Example data.** `pnpm --filter @vassist/db db:seed -- <owner email>` fills that owner's workspace with conversations in every state and with every handoff reason. It refuses to run against production, and it is re-runnable: it first removes the visitors it made before (those without a token hash) and touches nothing else. Node runs it directly, so it imports with `.ts` extensions and only from modules that have no extension-less imports (`client.ts`, `notices.ts`).
- **Verify at implementation:** the recommended way to connect Prisma 8 to Neon from Vercel (serverless) and from Neon Functions.

---

## 6. Auth

- **Neon Auth (Managed Better Auth)** handles owner accounts: email and password, magic link (log-in only), Google sign-in, email verification by 6-digit code, and password reset by 6-digit code. Emails go through Neon's shared sender.
- **Wiring.** `@neondatabase/auth` only: `createNeonAuth` from `@neondatabase/auth/next/server` (`lib/auth/server.ts`), the argument-less `createAuthClient` from `@neondatabase/auth/next` (`lib/auth/client.ts`), and the catch-all `app/api/auth/[...path]/route.ts`. Never import `better-auth/*` or pass plugins. Neon's Organization plugin is enabled on the branch and unused: workspaces and members are our own tables (section 5).
- **Auth forms call the browser auth client** (no server actions). It can throw on a non-2xx response instead of returning `{ error }`, so every call goes through `callAuth` in `lib/auth/errors.ts`, which maps Neon's error codes to our copy.
- Sessions are read **server-side** with `getSession()` (`lib/auth/session.ts`) in the base procedures and in the guards. Neon's docs tell pages to export `dynamic = 'force-dynamic'`; with `cacheComponents` that export is an error. Instead, layouts and pages stay synchronous and the session read sits in an async component inside `<Suspense>`.
- **Route protection has three layers.** `proxy.ts` runs `auth.middleware({ loginUrl: "/login" })` for `/dashboard/:path*` and `/onboarding` only, so the auth pages, the landing page and static assets stay reachable; it answers a missing session with a real redirect, refreshes the session cookie, and exchanges the `neon_auth_session_verifier` parameter that Google sign-in and magic links return with, which is why those callbacks point at `/dashboard`. The guards in `lib/auth/guards.ts` (`requireOwner`, `requireNoWorkspace`, `redirectIfSignedIn`) then apply the routing rules: no session goes to `/login`, a session without a workspace goes to `/onboarding`, a session with one leaves `/login`, `/signup` and `/onboarding` for `/dashboard`. The base procedures (section 4) check again on every call. The widget's `frame-ancestors` policy will be added to the same `proxy.ts`.
- **Verification codes.** The development branch does not email a code at sign-up, so the sign-up page requests it (`emailOtp.sendVerificationOtp`); the same call serves "Resend code" and a log-in with an unverified address. Codes expire after 5 minutes. Keep "send verification email on sign-up" off in production too, or people get two codes. An unverified session counts as no session in the guards and the base procedures (`proxy.ts` only checks that a session exists).
- **Password reset** is a custom form over the emailed-code methods (`forgetPassword.emailOtp`, then `emailOtp.resetPassword`), which avoids emailed links altogether. Neon's pre-built `ForgotPasswordForm` and `ResetPasswordForm` are not used.
- **After any change of session** (log-in, verification, log-out, workspace created) the client does a hard navigation (`hardNavigate` in `lib/navigation.ts`), so the router cache and preserved routes from the previous session are dropped.
- **Session cache.** The signed session cookie is trusted for 5 minutes (`sessionDataTtl`). Logging out in this browser is immediate; a session revoked elsewhere, or a deleted account, keeps working here for up to 5 minutes. Accepted for v1.
- **Known defect on the development branch (Neon's, not worked around).** Neon Auth returns URLs on a `c-6` host that does not serve this branch (section 15, item 3). Until Neon fixes it, magic links and "Continue with Google" stop at `Upstream control-plane error` on development. Email and password, verification codes and password reset work.
- **Account linking** is Better Auth's default: a Google sign-in for an address that already has a verified password account joins that account. There is no setting for it in Neon's configuration, and it could not be confirmed while the defect above blocks Google sign-in.
- **Production needs** (documented, not built): custom SMTP in place of the shared sender (`auth@mail.myneon.app`, rate-limited), our own Google OAuth credentials (the shared ones are for development and show Neon on the consent screen; the redirect URI is `{NEON_AUTH_BASE_URL}/callback/google`), the app's origins as trusted domains, "Allow localhost" off, the same auth settings as development (email and password, verification required by code, magic link with sign-up disabled), and its own `NEON_AUTH_COOKIE_SECRET`.
- **Visitor tokens** are JWTs we sign ourselves with `jose`. They're long-lived, refreshed periodically, bound to one workspace, and stored in the widget iframe's browser storage. Only a hash is stored in the database.
    - HS256, `aud: "widget"`, claims `{ sub: visitorId, wid: workspaceId, host, vsk }`, 30-day lifetime, re-issued by `widget.start` once a day. `vsk` is a random per-visitor secret; the database keeps only its SHA-256, so refreshing a token in one tab doesn't sign out another.
    - `visitorProcedure` reads the token from `Authorization: Bearer`, checks it against the stored hash, and rejects it once its `host` is no longer an allowed domain, so removing a domain cuts off tokens already issued.
    - The embed script passes the page's hostname to the iframe. `widget.start` only issues tokens for allowed domains, and `proxy.ts` sends a per-workspace `Content-Security-Policy: frame-ancestors` built from the allowed domains (exact host, any port; `'none'` when the list is empty), so browsers refuse to render the widget anywhere else. The host is reported by the page, so a script outside a browser can still claim an allowed domain and start a session; a public chat widget accepts that, and the CSP is what keeps the widget off other sites. The same goes for "snippet installed", which is recorded on the first session for an allowed domain.
    - Outside production (`NODE_ENV !== "production"`), `localhost` is allowed for every workspace in `widget.start`, `visitorProcedure` and the `frame-ancestors` policy without being stored (`lib/visitor/development-hosts.ts`), and it never marks the snippet installed.

---

## 7. Real time: PartyKit (Cloudflare PartyServer)

- **Source of truth for docs: [github.com/cloudflare/partykit](https://github.com/cloudflare/partykit)** (`packages/partyserver` and `packages/partysocket`). The old partykit.io docs are conceptually similar, but their package names, import paths and deployment (the PartyKit CLI instead of `wrangler`) are out of date.
- Server: `partyserver` on Cloudflare Workers + Durable Objects, deployed with `wrangler` from `apps/realtime`.
- Clients: `partysocket` in the dashboard and the widget.
- **Rooms:** two party classes, both with hibernation (`static options = { hibernate: true }`), and rooms named by id. `Conversation` (room = conversation id) carries messages, streamed agent text, typing indicators and state changes to the visitor and any owner viewing it. `Workspace` (room = workspace id) carries inbox updates and notifications to the owner only. URLs are `/parties/{conversation|workspace}/{id}`. The event types live in `packages/shared/src/realtime.ts`.
- **Connection security:** both the dashboard and the widget open sockets with a **realtime token** minted by Next.js: jose HS256 with `REALTIME_TOKEN_SECRET`, `aud: realtime`, 60 s expiry, used only to open the socket. `partysocket`'s async `query` fetches a fresh one on every reconnect. Owners get it from `realtime.getToken` (`ownerProcedure`, which first confirms a conversation belongs to their workspace), visitors from `widget.getRealtimeToken` (for the conversation the widget shows, their latest by default, after checking it's theirs). The Worker doesn't verify Neon Auth tokens: Neon Auth doesn't support custom claims, so its token can't carry `workspaceId`, and the Worker would need database access to map a user to a workspace or conversation.
- **Room checks:** `onBeforeConnect` verifies the token (missing, invalid, expired or wrong audience → 401) and its claims against the room: `workspace` only for an owner of that workspace, `conversation` only for the token's `conversationId` (otherwise 403). It then strips client-sent `x-vassist-*` headers and sets trusted ones, which `onConnect` stores in the connection state.
- **Publishing:** the Next.js server POSTs one event per request to the room with `Authorization: Bearer ${REALTIME_PUBLISH_SECRET}`, a separate secret the Worker checks in constant time. The body is validated against the room's event schema and broadcast. Publishing never fails the user's write: each POST is time-boxed and failures are only logged.
- **Client messages:** only typing may originate from clients, and only in a conversation room. The Worker relays it with the role from the token, never from the message. Everything else goes through oRPC.
- **Rule:** every message is saved to Postgres **before** it's published. PartyKit only delivers, and clients rebuild their state from the API when they reconnect.
- **Knowledge base events:** the workspace room also carries `source.updated`, `source.deleted` and `knowledge.updated` (suggested questions and whether the agent has knowledge), published by the web app and the `jobs` Neon Function with the same secret.
- **Development:** the dev Worker is deployed as `vassist-realtime-dev` (`pnpm realtime:deploy:dev`) and `REALTIME_URL` / `NEXT_PUBLIC_REALTIME_HOST` point at it. The Worker validates events against `packages/shared/src/realtime.ts`, so redeploy it whenever those schemas change.

---

## 8. AI

- **Vercel AI SDK 7** (`ai@7`) for every model call: classification (structured output), answers (streaming, image input), and suggested-question generation.
- **Neon AI Gateway** for every model call. Needs a Launch or Scale plan. Chat models go through `@neon/ai-sdk-provider` (`createNeon({ baseURL, apiKey })`; OpenAI models use the Responses API). Embeddings go through the gateway's OpenAI-compatible `/v1/embeddings` with `@ai-sdk/openai` 3.x (`createOpenAI({ baseURL: "<gateway>/v1" })`), because the Neon provider has no embedding models. One account limit of 200k tokens per minute covers both.
- **Models** (`packages/shared/src/agent.ts`). Every call pins its reasoning effort with `providerOptions.openai.reasoningEffort`, because the default is slow:

    | Use                                               | Model                                                        | Effort   |
    | ------------------------------------------------- | ------------------------------------------------------------ | -------- |
    | Classifier (`Output.object` with the four labels) | `gpt-5-4-nano`                                               | `none`   |
    | Off-topic refusals and small talk                 | `gpt-5-4-nano`                                               | `none`   |
    | Answers (streamed, with a `cannot_answer` tool)   | `gpt-5-6-terra`                                              | `none`   |
    | Suggested questions                               | `gpt-5-6-terra`                                              | `medium` |
    | Embeddings (chunks and queries)                   | `qwen3-embedding-0-6b`, 1024 dimensions, unit length, cosine | n/a      |

    Queries get Qwen's instruction prefix; chunks don't. No Gemini: through the Neon provider it goes via Chat Completions without structured output. Image input (AI-6) is deferred with attachments.

- **Retrieval tuning:** top 5 chunks; the best must reach cosine similarity 0.5 or the question hands off with `no_relevant_knowledge`; once it does, the others at 0.4 or more join it as context. The last 10 visitor, agent and member messages go along as history, and follow-ups of six words or fewer are embedded both alone and together with the previous visitor question, keeping whichever retrieves the better match. Search selects the workspace's chunks first (a materialized CTE), then ranks them.
- **"Can't answer":** the answer model calls the `cannot_answer` tool instead of writing text, which hands off with `low_confidence`. Nothing is published until 40 characters have arrived, so a tool call after a short lead-in is never seen; anything streamed before a later tool call is dropped (`agent.done`) and never saved.
- **Untrusted data:** each history message is its own `<message from="visitor|agent|team_member">` block with the author outside the body, and data can't open or close a block, so a visitor can't forge team member lines.
- **Streaming:** each `agent.chunk` carries the whole reply so far, batched (one publish in flight, at least 60 ms apart), so a client that joins mid-stream catches up. On success the reply is saved first and published as `message.created` with the streamed id, then `agent.done`; a discarded turn only publishes `agent.done`. The agent writes only while the conversation is `ai` and the visitor message it answers is still the conversation's newest message (`last_message_at`; checked before and every 300 ms during streaming, and again in the guarded save), so a take-over, hand-back or newer visitor message wins.
- **Execution:** the widget's `sendMessage` procedure saves the message and returns right away. The agent pipeline (classify, embed, retrieve, answer) starts as soon as the message is saved and is handed to Next.js's `after()`, within the 300-second `maxDuration` of the oRPC routes, and streams text chunks to the conversation's PartyKit room. The final message is saved to Postgres when streaming finishes. Every turn writes one `agent_turns` row (AI-11).

---

## 9. Background work: Neon Functions

One Neon Function, `jobs`, in `apps/functions`, declared in the root `neon.ts` (`@neon/config/v1`) together with its triggers, and deployed with `neon deploy` (`pnpm functions:deploy:dev` will target the `development` branch and read its env from the root `.env.local`; the function, `neon.ts` and that script are not built yet). It runs on Node.js 24, imports `packages/db` as TypeScript source (bundled by the Neon CLI's esbuild; the pooled `DATABASE_URL` is injected), and routes by path:

| Route                       | Called by                                          | Auth                                                                                                  |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/triggers/source-uploaded` | Storage trigger on `uploads`, prefix `workspaces/` | `X-Neon-Trigger-Invocation-Id` (Neon strips client-sent `X-Neon-*`), or the bearer secret for replays |
| `/triggers/auto-close`      | Schedule trigger, `*/15 * * * *` UTC               | Same                                                                                                  |
| `/ingest/text`              | Web app, from `after()`                            | `Authorization: Bearer ${FUNCTIONS_SECRET}`, compared in constant time                                |
| `/suggested-questions`      | Web app after a delete                             | Same                                                                                                  |

Routes answer `202` and work in `waitUntil`. Triggers are at-least-once, so ingest is idempotent: every run claims the next `sources.revision`, reads the file or text after claiming, and swaps the chunks in one transaction only while its revision is still the latest. A storage event only carries the bucket and key, so the function parses the workspace and source ids from the key, checks the source row belongs to that workspace with that exact key, HEADs the object, and skips a pure duplicate by ETag. Status changes publish `source.updated`, and suggested questions publish `knowledge.updated`, to the workspace room. Frankfurt is a supported Functions region.

| Function            | Trigger                                                                         | Does                                                                                  |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ingest              | Object Storage file-created trigger (text sources are sent directly by the app) | Parse → chunk → embed → save chunks and vectors → update the source's status          |
| Suggested questions | After any knowledge base change                                                 | Regenerate the workspace's four suggested questions                                   |
| Auto-close          | Schedule trigger (for example every 15 minutes)                                 | Close open conversations with no messages for 24 hours, and publish the closed notice |

- **PDF parsing:** `unpdf`. Markdown and TXT are read as-is.
- **Chunking:** a small custom splitter (by headings, then paragraphs, then sentences; about 800 tokens, estimated as characters ÷ 3.5, with about 100 tokens of overlap; each chunk starts with its heading path). No LangChain.
- **Failures** keep the previous version answering: a source that already has chunks stays `ready` with the readable reason in `error`; one without becomes `failed`. The 15-minute schedule also sweeps sources stuck in `uploaded` or `processing` for 15 minutes the same way, and an uploaded file whose source no longer exists is deleted.
- **DOCX** is deferred (PRD K-7).

---

## 10. Storage and uploads

- **Neon Object Storage** (S3-compatible) holds knowledge files, image attachments, and uploaded avatars.
- Uploads go **directly from the browser** using short-lived presigned URLs issued by an oRPC procedure, which enforces type and size first (10 MB).
- **Buckets:**
    - `profile-images` is **public-read**. It holds agent avatars (and later member photos), which the dashboard and widget load straight from the object's public URL: `${STORAGE_PUBLIC_BASE_URL}/profile-images/<key>`.
    - `uploads` is private and holds source files at `workspaces/<workspaceId>/sources/<sourceId>.<ext>` (attachments will use another prefix). `knowledge.createUpload` creates or reuses the source row first (same name, same source and key), then presigns a 5-minute PUT that signs `Content-Type` (derived from the extension) and `Content-Length`. On the development branch this bucket is inherited from the parent branch, so its CORS rule can only be changed there; the inherited rule already allows browser PUTs (confirmed from `http://localhost:3002` on Oct 11, 2026).
    - **Source upload flow** (`apps/web/server/knowledge.ts`, `apps/web/lib/storage/client.ts`):
        1. `knowledge.createUpload` takes the file name and size, rejects anything but `.pdf`, `.md` and `.txt` or over 10 MB, and derives the type from the extension. A file source with that name is reused as it is; a text source with that name is a `CONFLICT`.
        2. The browser PUTs the file with the returned `Content-Type`. Because the size is signed, a body of any other size is refused by the bucket (403).
        3. `knowledge.confirmUpload` HEADs the object. Nothing there is a `CONFLICT`; over 10 MB deletes the object, marks the source `failed` and answers `PAYLOAD_TOO_LARGE`; otherwise the source becomes `uploaded` with the stored size, and its `revision` goes up by one.
    - **An upload that never finishes.** There is no status for "uploading", so a new file source is created as `failed` with the reason "The upload didn't finish. Upload it again." and only `confirmUpload` clears it. The dashboard deletes that row itself when the PUT or the confirmation fails; a closed tab leaves it, saying what happened. Replacing a file reuses the source's key, so the PUT overwrites the old object in place and only the row waits for `confirmUpload`. A replacement whose PUT lands but is never confirmed leaves the new file under a row that still has its old size, status and `revision`. That is accepted for v1: the storage event from the PUT starts ingest, which claims the next `revision` itself.
    - **Deleting a source** deletes the row first, then the object, so the agent stops using it at once; an object that can't be deleted is logged and left behind.
    - **Text sources** (`knowledge.createTextSource`, `updateTextSource`, `getTextSource`) keep their text in `sources.text`, with `size_bytes` holding its UTF-8 length. Saving an edit raises `revision` and returns the status to `uploaded`. The list (`knowledge.listSources`) never carries the text.
    - **Not built yet:** ingestion. No function reads these files or texts, so every source stays `uploaded`, there are no chunks to preview (PRD K-6), and the agent stays off. The handlers mark where `source.updated`, `source.deleted` and `knowledge.updated` will be published; nothing is published now.
- **Agent avatar uploads are not built yet.** The `profile-images` bucket does not exist on the development branch, `widget.getSettings` always returns `agentAvatarUrl: null`, and every workspace shows the generated DiceBear avatar (`defaultAgentAvatarUrl` in `packages/shared/src/widget.ts`). The rest of this section about avatars is the design for when they are built.
- **Agent avatars** are limited to **2 MB** (Jan's decision; the 10 MB in PRD L-3 applies to attachments and sources) and must be PNG, JPEG, WebP or GIF.
- **Avatar flow:**
    1. `createAvatarUpload` checks the declared type and size and generates the key on the server, under the workspace's prefix: `workspaces/<workspaceId>/agent-avatar/<uuid>.<ext>`. It returns a presigned PUT (valid for 2 minutes) that signs `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`, which is safe because every upload gets a new key.
    2. The browser PUTs the file with exactly those headers.
    3. `confirmAvatarUpload` accepts only keys under the caller's own prefix, then HEAD-checks the stored object's real size and type. A presigned PUT can't limit size, so this is the actual 2 MB check. Rejected objects are deleted. On success it saves the key and only then deletes the previous avatar (a failed delete is logged and leaves an orphan).
    4. `removeAvatar` clears the key and deletes the object, and the widget falls back to the generated DiceBear avatar.
    - Uploads that are presigned but never confirmed are left in the bucket. That's acceptable for v1.
- **CORS** on `profile-images` (allowing PUT, GET and HEAD from `NEXT_PUBLIC_APP_URL`) is set by `pnpm --filter @vassist/web storage:cors`. Pass extra origins as arguments. It's idempotent, so run it once per branch's storage and again whenever the app's origin changes.
- **SDK settings:** `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` with `forcePathStyle: true`, and `requestChecksumCalculation` and `responseChecksumValidation` set to `WHEN_REQUIRED`. Without that, the presigner signs a checksum of an empty body and every browser PUT fails.

---

## 11. Visitor details

- **Country and city:** `geolocation()` from `@vercel/functions`, which reads the location headers Vercel adds to every request. No geo-IP service, and the raw IP is never stored.
- **Timezone, local time and language:** sent by the widget from the browser, which is more accurate than IP-based guesses.
- **Device, browser and OS:** parsed from the user agent with `ua-parser-js`.

---

## 12. Tooling

- **TypeScript strict** in every package.
- **pnpm workspaces.** No Turborepo.
- **ESLint** (flat config, `eslint-config-next`) + **`eslint-config-prettier`**, and **Prettier** with `prettier-plugin-tailwindcss`. One shared config at the repo root.
- **No automated test suite in v1.** The manual checklist in the PRD (section 9) is the acceptance test. Run the type check before calling any change done, because end-to-end types are the main correctness signal.

---

## 13. Deployment and environments

| Target     | Deploys                                        | Tool                                                                           |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Vercel     | `apps/web`                                     | Vercel Git integration                                                         |
| Cloudflare | `apps/realtime`                                | `wrangler`                                                                     |
| Neon       | Database, auth, functions, storage, AI gateway | Neon CLI (`neon.ts` + `neon deploy` recommended, to confirm at implementation) |

- **Neon branches:** `development` and `production`. Migrations always hit `development` first.
- **Region:** Frankfurt preferred, Ohio is fine.
- **Google sign-in** in production needs our own Google app credentials, configured per Neon branch.

---

## 14. Versions and documentation sources

Your training data is likely out of date for these. Always check the linked source.

| Library                                     | Version                                 | Docs                                                                     | Watch out for                                                                                                                                                                       |
| ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js                                     | 16                                      | [nextjs.org/docs](https://nextjs.org/docs)                               | App Router, `after()`                                                                                                                                                               |
| oRPC                                        | **v2 beta** (`2.0.0-beta.x`, pin exact) | [orpc.dev](https://orpc.dev) ([llms.txt](https://orpc.dev/llms.txt))     | A plain install gives **v1**. Install with `@beta`. v1 docs live at v1.orpc.dev and are wrong for v2                                                                                |
| Prisma                                      | **8 release candidate**                 | [prisma.io/docs/orm/v8](https://www.prisma.io/docs/orm/v8)               | New architecture (contracts, new CLI). Prisma 7 knowledge doesn't carry over                                                                                                        |
| Vercel AI SDK                               | 7                                       | [ai-sdk.dev/docs](https://ai-sdk.dev/docs)                               | v7 released Jun 25, 2026. v6 examples may not match                                                                                                                                 |
| PartyServer                                 | latest                                  | [github.com/cloudflare/partykit](https://github.com/cloudflare/partykit) | Not partykit.io                                                                                                                                                                     |
| Neon (Auth, Functions, Storage, AI Gateway) | GA since Sep 18, 2026                   | [neon.com/docs](https://neon.com/docs)                                   | `neon.ts` uses top-level `functions`, `buckets`, `triggers`; the Neon provider has no embeddings. The Auth docs' `force-dynamic` advice is wrong with `cacheComponents` (section 6) |
| TanStack Query                              | 5                                       | [tanstack.com/query](https://tanstack.com/query)                         | Use it through `@orpc/tanstack-query`                                                                                                                                               |

---

## 15. Deferred to implementation

1. ~~Models~~ Resolved: see section 8
2. ~~DOCX support~~ Resolved: deferred
3. ~~Whether magic links work with Neon's shared email sender~~ Resolved (Oct 10, 2026): the shared sender delivers magic link emails, and the request answers the same for known and unknown addresses. One Neon-side defect is open on the development branch: the auth service builds its own URLs on host `…neonauth.c-6…` while the branch's auth host is `c-7`, and the `c-6` host answers `Upstream control-plane error`. It breaks the link inside the magic link email and the redirect that starts Google sign-in; changing `c-6` to `c-7` by hand completes both. Emailed codes (verification, password reset) are not affected. We don't work around it; it is Neon's to fix
4. DiceBear avatar style. Provisional (Oct 11, 2026): `glass` from the hosted API, version 10.x, seeded with the workspace id, for the agent's default avatar. To confirm (PRD section 12, item 4)
5. ~~PartyServer details~~ Resolved: `Conversation` and `Workspace` party classes with hibernation, rooms named by id, sockets opened with short-lived Next-minted realtime tokens checked in `onBeforeConnect`, and publishing over HTTP with a separate secret (see section 7)
6. ~~How Prisma 8 connects to Neon on Vercel and in Neon Functions~~ Resolved: the same `postgres()` runtime from `@prisma/orm-postgres` (which brings `pg`) with the pooled `DATABASE_URL` in both; the Neon Function bundles `packages/db` as TypeScript source. pgvector will come from `@prisma/orm-extension-pgvector` (pinned to the same release as `@prisma/orm-postgres`), registered in `prisma.config.ts` and the client when chunks land (both files mark the place; it is not registered yet), with the HNSW index hand-written in its migration
7. ~~The embed script's bundler~~ Resolved: esbuild (see section 2). It is a single, fast devDependency with no config, and the loader is one small vanilla TypeScript file
8. ~~Whether to use `neon.ts` + `neon deploy`~~ Resolved: yes, for the `jobs` function and its triggers (section 9)
