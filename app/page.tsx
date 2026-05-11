/**
 * Top-level page: composes SearchForm + GifGrid + pagination controls and
 * owns the state that connects them.
 *
 * Marked `"use client"` because this component owns interactive state
 * (useState, event handlers, fetch on submit). The Route Handler does all
 * the server-side work; this page is purely a client orchestrator.
 *
 * State model:
 *   - query / caption / position : user inputs (controlled)
 *   - offset                     : current pagination cursor into Giphy
 *   - gifs                       : the 3 results currently displayed
 *   - totalCount                 : Giphy's reported total (for "next" gating)
 *   - status                     : 'idle' | 'loading' | 'ready' | 'error'
 *
 * Why a single `status` enum rather than separate isLoading / error booleans:
 *   the four states are mutually exclusive, so a union type makes invalid
 *   combinations unrepresentable (e.g. "loading and error at the same time").
 */

"use client";

import { useCallback, useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { GifGrid } from "@/components/GifGrid";
import type { CaptionPosition } from "@/components/GifCard";
import { PAGE_SIZE, type Gif } from "@/lib/giphy";

type Status = "idle" | "loading" | "ready" | "error";

export default function Home() {
  // ── User inputs ────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [position, setPosition] = useState<CaptionPosition>("bottom");

  // ── Results state ──────────────────────────────────────────────────────
  const [offset, setOffset] = useState(0);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  // ── Fetcher ────────────────────────────────────────────────────────────
  // useCallback isn't strictly required (no child receiving this as a prop
  // depends on referential equality), but it makes the dependency explicit
  // and stops the function from being recreated on every render. Cheap.
  const runSearch = useCallback(
    async (nextQuery: string, nextOffset: number) => {
      setStatus("loading");
      try {
        // Hits the proxy at /api/search — the browser never sees the
        // Giphy API key. URLSearchParams handles encoding for us.
        const params = new URLSearchParams({
          q: nextQuery,
          offset: String(nextOffset),
        });
        const response = await fetch(`/api/search?${params}`);

        if (!response.ok) {
          // Distinguish error from empty: the proxy returns 400/502 on
          // failure and 200 with an empty array on "no results". Only the
          // former should surface as an error state.
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          gifs: Gif[];
          totalCount: number;
        };

        setGifs(data.gifs);
        setTotalCount(data.totalCount);
        setStatus("ready");
      } catch (error) {
        // Log to console for debugging; UI just shows a generic error.
        console.error("Search failed", error);
        setStatus("error");
      }
    },
    []
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  // Form submit: reset offset to 0 (new searches start fresh) and fetch.
  const handleSubmit = useCallback(() => {
    setOffset(0);
    runSearch(query, 0);
  }, [query, runSearch]);

  // Pagination: nudge the offset by ±PAGE_SIZE and refetch with the SAME
  // query. We don't reset to 0 here because the user is navigating *within*
  // the current result set, not starting over.
  const handleNext = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    runSearch(query, nextOffset);
  }, [offset, query, runSearch]);

  const handlePrev = useCallback(() => {
    // Math.max guards against ever going below 0, which Giphy would reject.
    const nextOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(nextOffset);
    runSearch(query, nextOffset);
  }, [offset, query, runSearch]);

  // ── Derived ────────────────────────────────────────────────────────────
  // canPrev: any offset > 0 means there are earlier results to go back to.
  const canPrev = offset > 0 && status !== "loading";

  // canNext: there are more results beyond what's currently displayed AND
  // we're not mid-request. `offset + gifs.length < totalCount` is the
  // canonical "is there another page?" check.
  const canNext =
    offset + gifs.length < totalCount &&
    status !== "loading" &&
    gifs.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Giphy meme browser</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Search GIFs, slap a caption on them. Three at a time.
        </p>
      </header>

      <section aria-label="Search query">
        <SearchForm
          query={query}
          caption={caption}
          position={position}
          onQueryChange={setQuery}
          onCaptionChange={setCaption}
          onPositionChange={setPosition}
          onSubmit={handleSubmit}
          isLoading={status === "loading"}
        />
      </section>

      <section aria-label="Results" className="flex flex-col gap-4">
        <GifGrid
          gifs={gifs}
          caption={caption}
          position={position}
          status={status}
        />

        {/* Pagination controls only render once we have results. Hiding
            them entirely (rather than just disabling) keeps the idle state
            clean. */}
        {status === "ready" && gifs.length > 0 && (
          <nav
            aria-label="Result pagination"
            className="flex items-center justify-between gap-4"
          >
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canPrev}
              className="rounded-md border border-zinc-300 px-4 py-2 disabled:opacity-40 dark:border-zinc-700"
            >
              ← Previous
            </button>

            {/* Show the current window so the user knows where they are.
                "1–3 of 1,247" is more useful than buttons alone. */}
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {offset + 1} – {offset + gifs.length} of{" "}
              {totalCount.toLocaleString()}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="rounded-md border border-zinc-300 px-4 py-2 disabled:opacity-40 dark:border-zinc-700"
            >
              Next →
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
