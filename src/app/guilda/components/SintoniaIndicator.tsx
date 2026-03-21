"use client";

/** Ícone de “onda” / presença de voz (estilo Jami / sintonia). */
export default function SintoniaIndicator() {
  return (
    <span
      className="inline-flex h-4 items-end gap-0.5 px-0.5"
      title="Em sintonia de voz"
      aria-label="Em sintonia de voz"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)] animate-pulse"
          style={{
            height: `${8 + ((i * 17) % 11)}px`,
            animationDelay: `${i * 140}ms`,
          }}
        />
      ))}
    </span>
  );
}
