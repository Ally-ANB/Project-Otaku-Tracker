"use client";

import type { WatchProvider } from "@/lib/watchProviders";

type Props = {
  providers: WatchProvider[];
  size?: "sm" | "md";
  className?: string;
  /** Se true, ícones só ganham brilho forte no hover do pai (ex.: card). */
  dimUntilGroupHover?: boolean;
};

export default function WatchProviderStrip({
  providers,
  size = "sm",
  className = "",
  dimUntilGroupHover = false,
}: Props) {
  if (!providers?.length) return null;
  const wh = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${dimUntilGroupHover ? "opacity-50 group-hover:opacity-100 transition-opacity duration-300" : ""} ${className}`}
    >
      {providers.map((p, i) => (
        <a
          key={`${p.name}-${p.link}-${i}`}
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          title={p.name}
          onClick={(e) => e.stopPropagation()}
          className={`${wh} relative shrink-0 overflow-hidden rounded-lg border border-emerald-400/35 bg-zinc-950/90 shadow-[0_0_10px_rgba(52,211,153,0.35)] transition-all duration-300 hover:scale-110 hover:border-emerald-300 hover:shadow-[0_0_18px_rgba(52,211,153,0.65)]`}
        >
          {p.logo ? (
            <img src={p.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-emerald-400">
              ▶
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
