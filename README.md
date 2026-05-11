# Giphy meme browser

Small Next.js app that searches Giphy, displays 3 GIFs at a time with paginated
next/prev navigation, and overlays a user-supplied caption in a configurable
position (top, bottom, or below the image) — i.e. a lightweight meme browser.

## Run locally

```bash
pnpm install
cp .env.example .env.local
# edit .env.local and paste the Giphy API key
pnpm dev
```

Open <http://localhost:3000>.

The Giphy API key is **not** committed. For local dev, set `GIPHY_API_KEY` in
`.env.local`. For the Vercel deployment, set it as a Project Environment
Variable in the Vercel dashboard.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- No state library, no data-fetching library, no UI kit. See decision #5 below.

## Project layout

```
app/
  api/search/route.ts   # Server-side proxy to Giphy (hides the API key)
  page.tsx              # Client page: form + grid + pagination wiring
  layout.tsx
  globals.css
components/
  SearchForm.tsx        # Query input, caption input, position dropdown
  GifGrid.tsx           # 3-up horizontal (desktop) / vertical (mobile)
  GifCard.tsx           # Single GIF + overlaid/below caption
lib/
  giphy.ts              # Typed Giphy fetcher + narrowed response types
```

## Decisions & tradeoffs

This section exists so every architectural choice is auditable in conversation.
Each entry: **what** was decided, **why**, and **what was rejected**.

### 1. Use `/v1/gifs/search` instead of `/v1/stickers/search`

The brief's example URL uses `/stickers/search`, but the documentation link
points to the general search docs page covering both endpoints. Stickers have
transparent backgrounds and are designed to overlay other content (Stories,
chat) — against a page background with a separate text overlay, they look
disjointed. GIFs have their own backgrounds, which makes the caption-on-image
composition read like a meme — the user's stated intent.

**Rejected:** `/stickers/search` (matches the example literally, but worse
visual fit for the use case).

### 2. Server-side proxy via Next.js Route Handler for Giphy calls

The brief hands out an API key in plaintext. Calling Giphy directly from the
browser embeds the key in the JS bundle and on every network request — anyone
viewing the page can extract it. A `Route Handler` at `app/api/search/route.ts`
reads the key from `process.env.GIPHY_API_KEY` (server-only, never bundled to
the client) and forwards the query to Giphy.

The brief also mentions Giphy "requires the Search API call be made from the
client side." That guidance is a Terms-of-Service / analytics consideration
(Giphy's JS SDK tracks impressions and serves sponsored content), not a
technical block — the HTTP endpoint works fine server-side. For a code
challenge demonstrating architecture, hiding the key is the right signal. For a
real production integration with Giphy as a paying vendor, we'd revisit and
either use their SDK or implement their analytics callbacks.

**Rejected:** client-side `fetch` directly to Giphy (simpler diff, but leaks
the key and signals carelessness about secrets in a "start of a project"
context).

### 3. API key in `.env.local` (local) + Vercel Project env var (deployed)

Standard Next.js convention: `.env.local` is gitignored. `.env.example` is
committed and lists every required variable with empty values, so the next
developer (or CI) knows what to set without leaking the secret. On Vercel the
key is set as a Project Environment Variable so deploys pick it up
automatically.

### 4. Pagination via Giphy `offset` + `limit=3`, fetched on demand

Each next/prev click fetches the next 3 from Giphy (`offset += 3`). The brief
explicitly asks for 3 images at a time, so this matches the wire shape and
keeps memory/bandwidth minimal.

**Rejected:** fetch a large batch up front (e.g. 50) and slice client-side.
Faster perceived pagination but wastes bandwidth on results the user may never
see, and obscures the API surface we'd want when "more requirements surface
later" (e.g. infinite scroll, deep-linkable pages).

### 5. No state library, no data-fetching library

`useState` for query/caption/position/offset/results. A single `async`
function called from the form submit and the pagination buttons. TanStack
Query / SWR / Zustand are all reasonable in a bigger app, but for a screen
this small they add ceremony without solving a current problem. If
requirements later add caching across multiple pages or optimistic updates,
adding TanStack Query is a straightforward upgrade — current code wouldn't
fight that migration.

**Rejected:** TanStack Query, SWR, Zustand, Redux.

### 6. Plain `<img>` instead of `next/image` for the GIFs

`next/image` shines for static photography (responsive sizes, AVIF/WebP
conversion, lazy loading on a CDN). Animated GIFs from a third-party origin
aren't optimizable in the same way — the Image Optimization API doesn't
re-encode animated frames, and we'd still need to whitelist `media.giphy.com`
in `next.config.ts`. Plain `<img>` is one HTTP request, no config, behaves
correctly for animated content.

**Rejected:** `next/image` with `remotePatterns` for `media.giphy.com` —
ceremony with no real win for this content type.

### 7. Explicit submit (Enter key / Search button), no live/debounced search

Brief says "text field as a search input for the topic of the query" — reads
as a single submission. Live search is slick but spends API quota and triggers
the loading state on every keystroke. Easy to add later if desired.

**Rejected:** debounced live search.

### 8. Local React state, not URL search params

URL state would make searches deep-linkable and the back button useful.
Worthwhile in a real product, skipped here to stay within the 2-hour budget.
Listed in **Next steps** below so it's not lost.

### 9. Caption stored once, applied to all three displayed GIFs

The brief has a single caption text field and one position dropdown; nothing
suggests per-image captions. All three currently visible GIFs share the same
overlay. If per-image captions are wanted later, the data model changes from
`{caption}` to `Record<gifId, caption>` — a small refactor confined to
`page.tsx` and `GifCard.tsx`.

### 10. TypeScript types narrowed to the fields we actually use

`lib/giphy.ts` types only the response fields we read (`id`, `title`,
`images.downsized_medium.url`) rather than mirroring Giphy's full schema.
Tighter types, smaller surface to maintain, less chance of relying on a field
that turns out to be inconsistent.

### 11. Overlay captions use Impact + `-webkit-text-stroke` (system fonts, no web font)

Classic meme look — Impact face, all-caps, white fill, black outline. Using
`-webkit-text-stroke` rather than a drop-shadow produces a true outline on
every side (drop-shadow can only offset to one direction).

We rely on **system Impact** (bundled on macOS and Windows) with a
fall-through stack to Haettenschweiler, Franklin Gothic Bold, and Arial
Narrow Bold for Linux/odd setups. Considered loading a Google Font ("Anton"
is the closest free Impact analogue), but adding a render-blocking webfont
for a styling detail that already works on the vast majority of clients
isn't worth the load cost or extra moving part.

The "below" caption position deliberately does **not** get the Impact +
stroke treatment — it's a regular figcaption beneath the image, where the
meme aesthetic would feel misplaced.

**Rejected:** Google Font ("Anton") loaded via `next/font/google` — visually
nicer cross-platform, but unjustified weight for this use case.

### 12. Caption auto-fit is CSS-only (container queries + `cqi`)

The caption font size scales with the card's actual rendered width using
container query units: `font-size: clamp(0.75rem, 9cqi, 2.75rem)`. The card
declares itself a size container via `container-type: inline-size`. Effect:
- On a wide desktop card (~420px) the caption renders large and meme-y.
- On a narrow mobile card (~340px) it shrinks proportionally.
- Very long captions wrap to multiple lines via `break-words` rather than
  overflowing.

What this *doesn't* do: shrink the font further to keep long captions on
fewer lines. A 500-character caption will wrap to many short lines at the
clamped minimum size rather than shrinking the font to fit on (say) 2 lines.
True content-length-aware fitting requires JS measurement
(`useLayoutEffect` + binary search, or a lib like `@fit-text/react`). That
edge case is rare for actual meme captions and was deliberately deferred.

**Rejected:** JS-based fit-to-N-lines libraries — overkill for the realistic
caption lengths this app sees; adds bundle weight and re-render complexity.

## Known limitations / next steps

- Loading state is a simple "Loading…" — a skeleton grid would feel better.
- No error UI distinct from "no results" — Giphy errors currently surface as
  empty state. A real app would split these.
- No request cancellation; spamming next/prev can land results out of order.
  An `AbortController` keyed to the current request would fix it.
- **Download GIF with caption baked in** — would let users save a finished
  meme as a real animated GIF. Out of scope for this challenge: the implementation
  requires decoding the source GIF frame-by-frame, compositing the styled
  caption onto every frame on a canvas, and re-encoding the result with a
  proper color palette — a multi-day feature on its own, with non-trivial
  memory and CPU costs on mobile devices. The cheap alternative would be a
  single-frame PNG export (loses the animation), which we could ship in well
  under an hour if needed. Worth a real design conversation before
  committing engineering time.
- **Content-length-aware caption shrinking** — the current CSS-only auto-fit
  scales with card width, not text length, so very long captions wrap to
  many lines rather than shrinking to a tighter font size. JS-based
  fit-to-N-lines (e.g. `@fit-text/react`) is the upgrade path.
- URL search params (see decision #8).
- Per-image captions (see decision #9).
- Keyboard shortcuts for next/prev (←/→) and focus management on pagination.
- Tests. There's nothing here that needs unit tests today, but `lib/giphy.ts`
  is the obvious place to start when there is.

