"use client";

import { useEffect, useRef } from "react";
import { createGenerator } from "@/lib/generators";
import type { SliderConfig } from "@/lib/data";
import { SCALE_PARAM_KEY, SCALE_TIERS, type ScaleTier } from "@/lib/scale";

// `sliders` is now required — the caller (page.tsx) is responsible for
// resolving each type to a concrete slider list (its own, or a fallback)
// before passing it down. This component never has to know which case it is.
type ExplorerType = {
  key: string;
  label: string;
  examples: string;
  description?: string;
  generator: string;
  sliders: SliderConfig[];
  scaleTier?: ScaleTier | null;
};

type Palette = [string, string, string, string];

function MiniPreview({ type, colors }: { type: ExplorerType; colors: Palette }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // FIX (blocking issue 2): each card previews itself with its OWN default
  // params — never the params the user is currently editing for whichever
  // type happens to be active. This guarantees this card's generator always
  // receives the param keys it actually expects, regardless of which of the
  // other 3 cards is selected.
  // The extent is seeded here as well as on the page: these previews render
  // the same generators, which now derive their counts from it. Without it
  // every card would fall back to the generator's defensive default and could
  // disagree with the canvas it previews.
  const defaultParamsRef = useRef<Record<string, number>>({
    ...Object.fromEntries(type.sliders.map((s) => [s.key, s.default])),
    ...(type.scaleTier ? { [SCALE_PARAM_KEY]: SCALE_TIERS[type.scaleTier].defaultM } : {}),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generator = createGenerator(type.generator);
    const dpr = 1; // mini previews don't need retina resolution

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - start) / 1000;
      generator.draw(ctx, canvas.width, canvas.height, t, defaultParamsRef.current, colors);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type.generator, colors]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function MechanismTypeList({
  title = "MECHANISM TYPE",
  types,
  activeKey,
  onSelect,
  colors,
}: {
  title?: string;
  types: ExplorerType[];
  activeKey: string;
  onSelect: (key: string) => void;
  colors: Palette;
}) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
      <h3 className="font-mono text-xs tracking-[0.25em] text-white/50">{title}</h3>
      {types.map((type) => {
        const active = type.key === activeKey;
        return (
          <button
            key={type.key}
            onClick={() => onSelect(type.key)}
            className={`glass-panel glass-panel-glow flex items-center gap-4 p-3 text-left transition-shadow ${
              active ? "shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset]" : ""
            }`}
          >
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl">
              <MiniPreview type={type} colors={colors} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug text-white">{type.label}</div>
              <div className="mt-1 text-xs text-white/55">{type.examples}</div>
              {type.description ? (
                <div className="mt-1 text-xs leading-snug text-white/40">{type.description}</div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
