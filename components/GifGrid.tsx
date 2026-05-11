import type { Gif } from "@/lib/giphy";
import { GifCard, type CaptionPosition } from "./GifCard";

type Props = {
  gifs: Gif[];
  caption: string;
  position: CaptionPosition;
  status: "idle" | "loading" | "ready" | "error";
};

export function GifGrid({ gifs, caption, position, status }: Props) {
  if (status === "idle") {
    return (
      <p className="text-center text-zinc-500 dark:text-zinc-400">
        Type a search above to find some GIFs.
      </p>
    );
  }

  if (status === "loading") {
    // Intentionally simple — see README "Known limitations". A skeleton
    // grid would feel better; left as a follow-up.
    return (
      <p className="text-center text-zinc-500 dark:text-zinc-400">Loading…</p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-red-600 dark:text-red-400">
        Something went wrong. Please try again.
      </p>
    );
  }

  if (gifs.length === 0) {
    return (
      <p className="text-center text-zinc-500 dark:text-zinc-400">
        No GIFs found for that search.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      {gifs.map((gif) => (
        <div key={gif.id} className="flex-1 md:basis-0 min-w-0">
          <GifCard gif={gif} caption={caption} position={position} />
        </div>
      ))}
    </div>
  );
}
