/**
 * Query section: search input, caption input, position dropdown.
 *
 * This is a *controlled* form — the parent (page.tsx) holds the canonical
 * state for every field. That has two advantages here:
 *   1. The caption and position can update the visible GIFs live (no submit
 *      needed for those) while only the search query triggers a fetch.
 *   2. Pagination state in the parent stays in sync with the inputs.
 *
 * The trade-off is that this component is "dumb" — no internal state, no
 * validation logic. Fine for the current scope; if validation gets complex
 * we'd add a form library (react-hook-form, conform) rather than reinventing.
 */

"use client";

import type { CaptionPosition } from "./GifCard";

type Props = {
  query: string;
  caption: string;
  position: CaptionPosition;
  onQueryChange: (next: string) => void;
  onCaptionChange: (next: string) => void;
  onPositionChange: (next: CaptionPosition) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function SearchForm({
  query,
  caption,
  position,
  onQueryChange,
  onCaptionChange,
  onPositionChange,
  onSubmit,
  isLoading,
}: Props) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {/* Search query */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Search GIFs</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="e.g. cats, friday, programming"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
          required
          disabled={isLoading}
        />
      </label>

      {/* Caption text */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Caption (optional)</span>
        <input
          type="text"
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Text to display on or below the GIFs"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
        />
      </label>

      {/* Position dropdown */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Caption position</span>
        <select
          value={position}
          onChange={(event) =>
            onPositionChange(event.target.value as CaptionPosition)
          }
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-900"
        >
          <option value="top">On top of image — center top</option>
          <option value="bottom">On top of image — center bottom</option>
          <option value="below">Below image — center</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="self-start rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black disabled:opacity-50"
      >
        {isLoading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
