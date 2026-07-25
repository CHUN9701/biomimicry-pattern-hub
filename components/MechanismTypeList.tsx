"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { createGenerator } from "@/lib/generators";
import type { MechanismType } from "@/lib/mechanismTypes";

type MiniPreviewProps = {
  generatorKey: string;
  colors: [string, string, string, string];
  paramsRef: MutableRefObject<Record<string, number>>;
};

function MiniPreview({ generatorKey, colors, paramsRef }: MiniPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generator = createGenerator(generatorKey);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
      generator.draw(ctx, canvas.width, canvas.height, t, paramsRef.current, colors);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatorKey, colors]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function MechanismTypeList({
  types,
  activeKey,
  onSelect,
  colors,
  paramsRef,
}: {
  types: MechanismType[];
  activeKey: string;
  onSelect: (key: string) => void;
  colors: [string, string, string, string];
  paramsRef: MutableRefObject<Record<string, number>>;
}) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
      <h3 className="font-mono text-xs tracking-[0.25em] text-white/50">MECHANISM TYPE</h3>
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
              <MiniPreview generatorKey={type.generator} colors={colors} paramsRef={paramsRef} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug text-white">{type.label}</div>
              <div className="mt-1 text-xs text-white/55">{type.examples}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
