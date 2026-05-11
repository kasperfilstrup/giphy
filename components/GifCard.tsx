import type { Gif } from "@/lib/giphy";

export type CaptionPosition = "top" | "bottom" | "below";

type Props = {
  gif: Gif;
  caption: string;
  position: CaptionPosition;
};

const AUTO_FIT_FONT_SIZE = "text-[clamp(0.75rem,9cqi,2.75rem)]";

export function GifCard({ gif, caption, position }: Props) {
  
  const overlayBase =
    "absolute left-0 right-0 px-2 text-center uppercase tracking-wide leading-tight " +
    "text-white pointer-events-none break-words " +
    `${AUTO_FIT_FONT_SIZE} ` +
    "[-webkit-text-stroke:0.5cqi_black] [paint-order:stroke]";

  const overlayStyle: React.CSSProperties = {
    fontFamily: 'Impact, "Haettenschweiler", "Franklin Gothic Bold", "Arial Narrow Bold", "Charcoal", sans-serif',
    fontWeight: 900,
  };

  return (
    // `@container` makes the figure a size container so children can size against its width via `cqi`. 
    <figure className="flex flex-col gap-2 @container">
      <div className="relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
        <img
          src={gif.url}
          alt={gif.title || caption || "GIF"}
          className="block w-full h-auto"
          loading="lazy"
        />

        {position === "top" && caption && (
          <span className={`${overlayBase} top-[3cqi]`} style={overlayStyle}>
            {caption}
          </span>
        )}
        {position === "bottom" && caption && (
          <span className={`${overlayBase} bottom-[3cqi]`} style={overlayStyle}>
            {caption}
          </span>
        )}
      </div>

      {position === "below" && caption && (
        <figcaption
          className={`text-center font-semibold leading-tight ${AUTO_FIT_FONT_SIZE}`}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
