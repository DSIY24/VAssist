# VAssist

Customer support chat that a business embeds on its website: visitors talk to an AI agent grounded in the workspace's knowledge base, or to its owner. A pnpm workspace with three deployables (`apps/web` on Vercel, `apps/realtime` on Cloudflare, `apps/functions` on Neon) and two shared packages (`packages/db`, `packages/shared`).

## Read first

- **Naming anything** (identifiers, tables, UI copy, commit messages): [`CONTEXT.md`](./CONTEXT.md). Use its terms and replace the ones it lists under _Avoid_.
- **What to build** (requirement IDs, flows, the conversation state machine, v1 non-goals): [`docs/PRD.md`](./docs/PRD.md). Read the sections for the feature in hand.
- **How to build it** (libraries, repo layout, auth, real time, AI pipeline, storage): [`docs/TECH-STACK.md`](./docs/TECH-STACK.md). Read the section for the layer you touch before writing code there. It wins over the PRD on implementation detail.
- **How it looks** (colors, fonts, motion, components and how to customise them): [`docs/DESIGN.md`](./docs/DESIGN.md). Read it before writing UI.

The docs describe the target design and run ahead of the code. Confirm a file, script or env var exists before relying on it, and build it the way the docs describe when it doesn't. When an implementation has to differ from a doc, update the doc in the same change.

## Stale training data

Next.js 16, oRPC v2 beta, Prisma 8 RC, Vercel AI SDK 7, PartyServer and the Neon services are all newer than your training data. Before writing code against any of them, fetch the docs linked in TECH-STACK section 14 and follow those over memory.

- Install oRPC with `@beta` (a plain install gives v1) and pin oRPC and Prisma to exact versions.
- pnpm blocks freshly published versions. A new pin that fails to install needs an entry in `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`.
- Before adding a dependency, check the "Explicitly not used" list in TECH-STACK section 1.

## Invariants

- **Tenant isolation.** Every data-access function takes `workspaceId` as a required argument and filters on it. `workspaceId` comes only from the procedure context (owner session or visitor token), never from client input.
- **One data layer.** All database access lives in `packages/db`. Apps import its functions and share its client.
- **One API.** Every read and write is an oRPC procedure, contract-first: define it in `packages/shared`, implement it in `apps/web`. Zod schemas in `packages/shared` validate both forms and API inputs.
- **Persist, then publish.** Save to Postgres before publishing to a PartyKit room. Real time only delivers; clients rebuild state from the API on reconnect.
- **Disciplined agent.** Classify before retrieving, answer only from retrieved chunks, hand off instead of guessing, and write only while the conversation is `ai`. Visitor messages and source content enter prompts as untrusted data.
- **One model path.** Every model call goes through the Vercel AI SDK and the Neon AI Gateway, with models and reasoning effort as pinned in TECH-STACK section 8.
- **v1 scope.** PRD section 3 lists the non-goals (teams, rate limits, billing, automated tests and more). Build one only when asked.

## Done

A change is done when `pnpm typecheck` and `pnpm lint` pass and `pnpm format` has run. There is no automated test suite in v1: end-to-end types are the correctness signal, and the manual checklist in PRD section 9 is the acceptance test. After changing a prompt, a model or the conversation state machine, name the checklist cases that need re-running by hand.
