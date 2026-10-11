# VAssist: Design system (v1)

> **For coding agents:** this is the source of truth for how VAssist _looks_. [`PRD.md`](./PRD.md) defines what it does, [`TECH-STACK.md`](./TECH-STACK.md) how it is built, and [`CONTEXT.md`](../CONTEXT.md) the words used in UI copy. Tokens live in [`apps/web/app/globals.css`](../apps/web/app/globals.css); when a value here and a token there disagree, fix both in the same change.

|                |                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Status         | First version, written with the landing page (Oct 9, 2026); auth pages and dashboard shell added Oct 10, 2026; dark mode Oct 11, 2026 |
| Applies to     | The landing page, the auth pages and the dashboard shell now; the widget as it lands                                                  |
| Companion docs | [`PRD.md`](./PRD.md), [`TECH-STACK.md`](./TECH-STACK.md)                                                                              |

---

## 1. Principles

1. **One design system.** The landing page, the dashboard and the widget share one set of tokens and one component library (TECH-STACK section 3). The landing page is the expressive end of it, the dashboard and widget the quiet end.
2. **shadcn/ui first.** Reach for a component in `apps/web/components/ui` before writing markup. If it doesn't exist, add it with the shadcn CLI from `apps/web`. If it doesn't fit, customise it with `className` at the call site, or add a variant when the same customisation shows up twice. Never hand-roll a second button, dialog or menu.
3. **Tokens, not values.** Colors, fonts, easings and entrance animations come from the theme. A raw hex or `cubic-bezier()` in a component is a bug, with one exception: the poster's layout coordinates (section 6), which are a composition rather than a scale.
4. **Ink on a dark stage, one accent.** Marketing surfaces are near-black with white type and a single pink gradient. Color is spent on the subject, never on chrome.
5. **Motion plays once and then gets out of the way.** Entrances run a single time, respect `prefers-reduced-motion`, and never animate a property that carries layout or optical correction.

---

## 2. Color

### Poster palette (landing and marketing surfaces)

| Token          | Value     | Tailwind                           | Use                                              |
| -------------- | --------- | ---------------------------------- | ------------------------------------------------ |
| `poster`       | `#161616` | `bg-poster`, `text-poster`         | The stage background, and text on white controls |
| `poster-ink`   | `#ffffff` | `text-poster-ink`, `bg-poster-ink` | Wordmark, nav, brand mark, filled controls       |
| `poster-copy`  | `#f7f7f7` | `text-poster-copy`                 | Supporting copy in the corners                   |
| `blossom-from` | `#ffc5dc` | `from-blossom-from`                | Top of the accent gradient                       |
| `blossom-to`   | `#fd86db` | `to-blossom-to`                    | Bottom of the accent gradient                    |

The accent is always the vertical gradient `bg-linear-to-b from-blossom-from to-blossom-to`, clipped to text with `bg-clip-text text-transparent`. It marks the second half of the wordmark and nothing else on the poster. Don't use it for buttons, links or borders.

Hover on a white control is `bg-poster-ink/85`. Frosted surfaces over the stage are `bg-poster/70` with `backdrop-blur-2xl` and a `border-white/10` edge.

### Product palette (dashboard and widget)

The dashboard and widget use the stock shadcn `neutral` tokens (`background`, `foreground`, `primary`, `muted`, `border`, `destructive` and the rest), defined for light and for `.dark` in `globals.css`. Use them through their utilities (`bg-background`, `text-muted-foreground`, `border-border`).

**Light and dark.** The dashboard and the auth pages follow the theme the owner picks: light, dark or system (the default). `next-themes` puts `dark` on `<html>` through `ThemeProvider` (`components/theme-provider.tsx`, wrapped around the app in `app/layout.tsx`) and remembers the choice in the browser. `ModeToggle` (`components/mode-toggle.tsx`) is the control for it, in the dashboard header and the auth shell header. Product UI gets both themes by using the tokens; reach for a `dark:` utility only where a token can't express the difference.

The widget's accent is chosen by the owner (PRD D-9: blue by default, or indigo, violet, pink, red, orange, green), each with a readable text color picked automatically. That palette is not defined yet. When it is added, record it here.

A marketing surface is dark whatever the theme: it opts into the dark shadcn tokens by putting `dark` on its own root, so focus rings and any stock component inside it read correctly on `poster`.

---

## 3. Typography

| Role    | Font             | Token / utility | Loaded in                 | Use                                                                  |
| ------- | ---------------- | --------------- | ------------------------- | -------------------------------------------------------------------- |
| Sans    | Geist            | `font-sans`     | `apps/web/app/layout.tsx` | Everything by default: nav, buttons, copy, the dashboard, the widget |
| Display | Instrument Serif | `font-display`  | `apps/web/app/layout.tsx` | The wordmark and large marketing headings only                       |

Both are loaded with `next/font/google` and exposed as CSS variables, so there is no layout shift and no request to Google at runtime. Instrument Serif ships a single weight (400). Never fake a bold with it, and never use it below about 28px or for body copy. Fallbacks are `"Times New Roman", Times, serif`.

Poster type is fluid, sized against both viewport axes so the composition holds at any aspect ratio:

| Element        | Size                                                           | Tracking            |
| -------------- | -------------------------------------------------------------- | ------------------- |
| Wordmark       | `min(35vw, 62dvh)`; portrait `min(33vw, 22dvh)`                | `0.033708em`        |
| Nav and button | `clamp(13px, min(1.302083vw, 2.05dvh), 25px)`                  | button `0.026923em` |
| Corner copy    | `clamp(14px, min(1.40625vw, 2.102804dvh), 27px)`, leading 1.25 | none                |

**Optical stretch.** Poster text is widened slightly with `scale-x-[…]` from `origin-left` (nav 1.052–1.168, corner copy 1.058–1.073, the wordmark's "V" 1.0866). The stretch is part of the letterform, so nothing may animate `scale` or `transform` on those elements. Animate a child instead.

**Wordmark.** "V" in `poster-ink`, "Assist" in the blossom gradient, always written `VAssist`.

**Copy.** UI text uses the terms in `CONTEXT.md`: agent, owner, visitor, knowledge base, handoff, widget, snippet. Never "bot", "chatbot", "customer" or "ticket". Sentence case everywhere, no exclamation marks.

---

## 4. Shape, spacing and layers

- **Radius.** Marketing controls are full pills (`rounded-full`). Product UI uses the shadcn radius scale (`--radius: 0.625rem`, `rounded-lg` by default). The mobile sheet uses `rounded-b-3xl`.
- **Brand mark.** A four-stroke asterisk, `viewBox="0 0 66 62"`, 5px strokes with square caps (`components/brand-mark.tsx`, shared by the landing page, the auth pages and the dashboard). It takes `currentColor`: white on the poster, `foreground` in product UI. The favicon (`app/icon.svg`) is the same mark on a `poster` tile.
- **Product wordmark.** In the dashboard and on auth pages the brand is the mark next to "VAssist" in Geist (`font-sans text-base font-semibold`). Never Instrument Serif at that size, and never the blossom gradient.
- **Poster layers.** wordmark `z-1` → subject `z-2` → corner copy `z-3` → brand, nav and button `z-4` → menu trigger `z-12`. Overlays portal to `body` at `z-50`.
- **Focus.** Every interactive element shows `focus-visible:ring-3 focus-visible:ring-ring/50`.

---

## 5. Motion

| Token                    | Curve / animation                                 | Use                                  |
| ------------------------ | ------------------------------------------------- | ------------------------------------ |
| `ease-poster-reveal`     | `cubic-bezier(.16, 1, .3, 1)`                     | Large reveals: wordmark, subject     |
| `ease-poster-soft`       | `cubic-bezier(.25, .8, .28, 1)`                   | Everything small                     |
| `animate-poster-word`    | `translateY(118% → 0)`, no fade, 1150ms           | Wordmark rising out of its mask      |
| `animate-poster-subject` | fade + `translateY(3.4dvh → 0)`, 1150ms, no scale | The subject image                    |
| `animate-poster-corner`  | fade + `translateY(.7em → 0)`, 720ms              | Corner copy                          |
| `animate-poster-quiet`   | fade + `translateY(6px → 0)`, 620ms               | Brand mark, button, menu trigger     |
| `animate-poster-dim`     | fade only, 550ms                                  | Nav items                            |
| `animate-poster-fade`    | fade only, 280ms                                  | The whole stage under reduced motion |

**Entrance choreography** (desktop delays; the compact layout tightens the last three by about 100ms):

| Element      | Animation | Delay                   |
| ------------ | --------- | ----------------------- |
| Brand mark   | quiet     | 100ms                   |
| Nav 1–4      | dim       | 180 / 225 / 270 / 315ms |
| Button       | quiet     | 340ms                   |
| Wordmark     | word      | 300ms                   |
| Subject      | subject   | 660ms                   |
| Both corners | corner    | 980ms, together         |

How it is wired: `PosterStage` renders `data-entering` on the stage and removes it when the last `poster-*` animation finishes (6s safety), so the entrance never replays. Children opt in with `motion-safe:group-data-entering/stage:animate-poster-*` plus an `[animation-delay:…]`. Under `prefers-reduced-motion` only the stage fades.

**Morph-reveal trail** (`components/landing/flower-reveal.tsx`). Moving the mouse over the stage leaves a morphing organic blob trail that cuts the front image away and paints the reveal image in the same shape; the wordmark shows through wherever both are transparent. Constants: head radius 140px, 24-point blobs with 44px of noise, sampled every 8px, 60 points at most, alpha × 0.92 per frame. While the trail is alive the front image is swapped for two canvases: one draws the front image with the blobs punched out (`destination-out`), the other draws the reveal image inside them (`source-in`). Don't drive it with a per-frame `mask-image` data URL: browsers load those asynchronously and the effect never paints. The stage sets `cursor-default`, so the wordmark under the pointer doesn't show a text cursor. Don't replace it with a circular spotlight.

Product UI motion is the shadcn default (150–200ms fades and short slides via `tw-animate-css`). Keep the poster animations out of the dashboard and widget.

---

## 6. Layout: the poster

The landing page is a full-viewport poster with no scroll: `main` is `fixed inset-0`, and the stage inside it is `contain-strict isolate`. Everything is absolutely positioned in `vw` and `dvh`, so the composition scales as one piece.

| Element     | Position                                                                               |
| ----------- | -------------------------------------------------------------------------------------- |
| Brand mark  | `top 2.141745dvh`, `left 3.854167vw`, width `clamp(34px, min(3.4375vw, 5.2dvh), 66px)` |
| Nav items   | `top 3.426791dvh`; `left` 10.104167 / 17.526042 / 27.578125 / 36.171875 `vw`           |
| Button      | `top 2.336449dvh`, `right 7.5vw`, height `clamp(34px, 4.439252dvh, 57px)`              |
| Wordmark    | `top 11.565421dvh`, `left 4.348958vw`                                                  |
| Subject     | `top 14.749065dvh`, `left 49.121328vw`, height `106.109034dvh`, centered on its `left` |
| Corner copy | `bottom 4.361371dvh`; `left 3.177083vw` and `left 78.28125vw`                          |

The nav container covers the stage with `pointer-events-none` and each link opts back in, so the subject stays hoverable underneath.

Three custom variants, defined in `globals.css`, adapt it:

| Variant    | Media query                                     | What changes                                                                                               |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `narrow:`  | `(max-width: 1200px), (orientation: portrait)`  | The wordmark centers                                                                                       |
| `compact:` | `(max-width: 900px), (max-aspect-ratio: 4 / 5)` | Nav and button give way to the menu trigger and sheet                                                      |
| `tall:`    | `(max-aspect-ratio: 4 / 5)`                     | Smaller centered subject (`min(55dvh, 110vw)`), smaller wordmark, corner copy wraps and pins to both edges |

Imagery lives in `apps/web/public/landing/` as 1280px-wide WebP with transparent backgrounds, rendered with `next/image`. The two lilies share a framing so they register when one is revealed through the other.

---

## 7. Components

### In use

| Component                              | Source                        | Notes                                                                                                                          |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                               | `components/ui/button.tsx`    | shadcn `base-nova` on Base UI. Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`                     |
| `Sheet`                                | `components/ui/sheet.tsx`     | Base UI dialog. Gives the scrim, Escape, focus trap and inert background for free                                              |
| `Sidebar`                              | `components/ui/sidebar.tsx`   | The dashboard frame. Becomes a `Sheet` below 768px, toggles with Ctrl/Cmd+B, remembers its state in the `sidebar_state` cookie |
| `DropdownMenu`, `Avatar`, `Tooltip`    | `components/ui/`              | The user button and its menu; tooltips on the collapsed sidebar. A `DropdownMenuLabel` must sit inside a `DropdownMenuGroup`   |
| `Field`, `Input`, `Label`, `Separator` | `components/ui/`              | Forms. `FieldError` under the field takes React Hook Form errors directly                                                      |
| `InputOTP`                             | `components/ui/input-otp.tsx` | 6-digit codes, through `components/auth/code-input.tsx`                                                                        |
| `Skeleton`                             | `components/ui/skeleton.tsx`  | Suspense fallbacks. Don't use `SidebarMenuSkeleton` in a fallback: it calls `Math.random()`, which fails prerendering          |
| `ModeToggle`                           | `components/mode-toggle.tsx`  | The theme menu (light, dark, system): an outline icon `Button` opening a `DropdownMenu` radio group                            |
| `useIsMobile`                          | `hooks/use-mobile.ts`         | Our own `useSyncExternalStore` version. The registry's fails lint, so don't re-add it                                          |

### Recipes

**Poster pill** (the landing call to action). The stock `Button`, customised at the call site:

```tsx
<Button
    nativeButton={false}
    render={<Link href="/signup" />}
    className="rounded-full bg-poster-ink font-normal text-poster hover:bg-poster-ink/85"
>
    Get started
</Button>
```

**Menu trigger.** `Button` with `size="icon-lg"`, `size-11 rounded-full bg-poster-ink text-poster`, rendered through `SheetTrigger`.

**Frosted sheet.** `SheetContent side="top"` with `dark rounded-b-3xl border-white/10 bg-poster/70 backdrop-blur-2xl text-poster-ink`. Links inside are `SheetClose` rendered as `Link`, so choosing one closes the sheet.

**Auth shell** (`components/auth/auth-shell.tsx`, from the `login-02` and `signup-02` blocks). One two-column frame for log-in, sign-up, forgot-password, reset-password and the first-run step: the product wordmark, the `ModeToggle` and a `max-w-xs` form column on the left, the cover panel on the right from `lg` up. The cover is the poster in miniature: `dark` on its root, `bg-poster`, the lily from `public/landing/` and the display wordmark, static, with no entrance animation or trail. Lily and wordmark are sized from one variable, `--cover: min(50vw, 86svh)`, so they keep their overlap at any panel shape; like the poster's coordinates (section 6) these values are a composition, not a scale.

**Auth forms** (`components/auth/`). Heading, one line of muted copy, fields, primary button, then secondary actions. Field errors sit under their field. A form-level error (`FormNotice`) sits above the primary button; a notice the page opens with (after a password reset, or a failed log-in link) sits above the fields. Every submit shows a pending label ("Logging in…") and disables the form's buttons. Secondary actions that do something are `Button variant="link"` ("Resend code", "Log out"); ones that go somewhere are `AuthLink` ("Forgot password?", "Use a different email"). The shared pieces are in `auth-parts.tsx`; `VerifyCodeStep` is the one code screen for sign-up and unverified log-in.

**Dashboard shell** (`components/dashboard/`, from the `dashboard-01` block). `Sidebar variant="inset" collapsible="icon"`: product wordmark at the top, the nav items from `nav.ts` as `SidebarMenuButton render={<Link />}` with `tooltip` and `isActive`, the user button at the bottom. The header carries the sidebar trigger, the page title and, at its right edge, the `ModeToggle`. The layout is synchronous and wraps the async shell in `<Suspense>` with `DashboardShellSkeleton`, a static frame of plain `Skeleton` blocks.

**User button.** A circular `Avatar` showing the photo when the owner has one (Google) and otherwise their initials, with name and email truncated beside it. Its menu holds the name, the email and "Log out". DiceBear avatars come with account settings (PRD A-5).

**Empty state** (`components/dashboard/empty-state.tsx`). An icon tile, an `h2` and one muted line, centered in the content area. Used by the "Home" and "Inbox" placeholders.

### Rules

- shadcn here is built on **Base UI**, not Radix: compose with the `render` prop where Radix would use `asChild`, and pass `nativeButton={false}` when a button renders a link.
- A link that looks like a button is a `Button` rendering a `Link`. A plain text link is a `Link` with the focus ring from section 4.
- Icons come from `lucide-react`, sized by the component (`size-4` by default).
- Promote a recipe to a `Button` variant the second time it is needed, and update this section.

### Landing components

`components/landing/`: `poster.tsx` (the composition and its copy), `poster-stage.tsx` (entrance state), `flower-reveal.tsx` (subject and trail), `poster-menu.tsx` (compact menu). The brand mark is shared (`components/brand-mark.tsx`).

---

## 8. Open items

1. The widget accent palette from PRD D-9, with its automatic text colors.
2. Dashboard patterns (conversation list, state badges, source status) as they are built. The shell, the user button and the empty state exist (section 7).
3. The landing nav links "Knowledge", "Handoff" and "Widget" point at `#` anchors that have no sections yet, because the poster does not scroll. Decide whether they become pages, sections below the poster, or come out.
