/**
 * Thin wrapper around Giphy's /v1/gifs/search endpoint.
 *
 * This module is intentionally framework-agnostic — it doesn't import from
 * `next/*`. The Route Handler in app/api/search/route.ts owns the
 * request/response shape; this file owns "talk to Giphy and give me typed
 * data back." Keeping them separate means we can reuse this from a Server
 * Action, a Server Component, or a test, without dragging Next-specific
 * types along.
 *
 * Decision recap (see README §1, §2, §10):
 *   - /v1/gifs/search, not /stickers — better visual fit for meme-style overlays
 *   - Reads GIPHY_API_KEY from process.env, never accepts it as an argument,
 *     so callers can't accidentally pass it from a client component
 *   - Response is narrowed to only the fields we actually render
 */

// ── Public shape returned to callers ────────────────────────────────────────
// We deliberately do NOT export Giphy's full response schema. Narrow types =
// smaller surface to maintain + fewer fields we accidentally start depending
// on. If a new field is needed later, add it here explicitly.
export type Gif = {
  id: string;
  title: string;
  // The brief specifies this exact image variant. Hardcoded on purpose —
  // if requirements change to "use the original" we'll touch one place.
  url: string;
};

export type SearchResult = {
  gifs: Gif[];
  // total_count from Giphy's pagination block — lets the UI disable "Next"
  // when we've reached the end of the result set.
  totalCount: number;
};

// ── Giphy response shape (only the fields we read) ──────────────────────────
// Typed as the *minimum* we touch. If Giphy adds fields, we don't care.
// If Giphy removes one of these, the fetch helper below will fail loudly,
// which is what we want.
type GiphyApiResponse = {
  data: Array<{
    id: string;
    title: string;
    images: {
      downsized_medium: { url: string };
    };
  }>;
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
};

// ── Constants ───────────────────────────────────────────────────────────────
// Pulled out so the proxy route and any future caller agree on the same
// limit, and so a Reviewer can see them at a glance without digging into the
// URL builder.
const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs/search";

// Per the brief — must be 'g'. Lifted to a constant so the requirement is
// visible at the top of the file rather than buried in a query string.
const RATING = "g";

// Brief asks for 3 images at a time. Exported so the UI can match without
// duplicating the magic number.
export const PAGE_SIZE = 3;

// ── The fetcher ─────────────────────────────────────────────────────────────
export async function searchGifs(params: {
  query: string;
  offset: number;
}): Promise<SearchResult> {
  // Read the key at call time (not module load). This matters because:
  //   1. Vercel evaluates env vars per-invocation in serverless contexts.
  //   2. It makes a missing key surface as a clear runtime error here,
  //      rather than a confusing "undefined" later in the URL.
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GIPHY_API_KEY is not set. Add it to .env.local (local) or the Vercel " +
        "project's environment variables (deployed)."
    );
  }

  // Build the URL with URLSearchParams rather than string concatenation so
  // the query and any future special characters are encoded correctly.
  const url = new URL(GIPHY_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("q", params.query);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(params.offset));
  url.searchParams.set("rating", RATING);

  // `cache: "no-store"` — opt out of Next's fetch caching for this request.
  // Search results depend entirely on user input and we always want fresh
  // results when the user paginates. Keeping it explicit (rather than
  // relying on Next 16's default for dynamic routes) makes the intent
  // obvious to anyone reading.
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    // Surface Giphy's status code so the proxy can map it to a sensible
    // HTTP response. We don't leak the body — it can contain the API key
    // echoed back in some error shapes.
    throw new Error(`Giphy responded with ${response.status}`);
  }

  const json = (await response.json()) as GiphyApiResponse;

  return {
    // Map Giphy's verbose shape to our narrow Gif type. Done once, here,
    // so the rest of the app never sees `images.downsized_medium.url`.
    gifs: json.data.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.images.downsized_medium.url,
    })),
    totalCount: json.pagination.total_count,
  };
}
