# apps/web

The dashboard, the widget iframe route, the oRPC handlers and the agent pipeline. Project-wide rules are in the root [`AGENTS.md`](../../AGENTS.md); TECH-STACK sections 3 and 4 cover the frontend and API patterns used here.

- **shadcn/ui here is built on Base UI** (`@base-ui/react`, style `base-nova`), where Radix habits fail: compose with the `render` prop where Radix would use `asChild`. Add components with the shadcn CLI from this directory so they match.
- **One design system** for the dashboard and the widget. The widget settings preview renders the real widget components.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
