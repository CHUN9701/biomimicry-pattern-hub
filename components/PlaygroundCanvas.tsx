"use client";

import { useEffect, useRef, useState } from "react";
import { createGenerator } from "@/lib/generators";
import type { Category, Variant } from "@/lib/data";

export default function PlaygroundCanvas({
  category,
  variant,
}: {
  category: Category;
  variant: Variant;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef<Record<string, number>>({});
  const [params, setParams] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    variant.sliders.forEach((s) => {
      init[s.key] = s.default;
    });
    return init;
  });
  paramsRef.current = params;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generator = createGenerator(variant.generator);
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
      generator.draw(ctx, canvas.width, canvas.height, t, paramsRef.current, category.colors);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [variant.generator, category.colors]);

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="glass-panel relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[28rem] lg:flex-1">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div className="glass-panel w-full shrink-0 p-6 lg:w-80">
        <h3 className="font-mono text-xs tracking-[0.25em] text-white/50">PARAMETERS</h3>
        <div className="mt-5 flex flex-col gap-6">
          {variant.sliders.map((slider) => (
            <div key={slider.key}>
              <div className="mb-2 flex items-center justify-between text-sm text-white/80">
                <label htmlFor={slider.key}>{slider.label}</label>
                <span className="font-mono text-xs text-white/50">
                  {Number.isInteger(slider.step) ? params[slider.key] : params[slider.key]?.toFixed(3)}
                  {slider.unit ?? ""}
                </span>
              </div>
              <input
                id={slider.key}
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={params[slider.key]}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, [slider.key]: parseFloat(e.target.value) }))
                }
                className="range-slider w-full"
                style={{ accentColor: category.colors[2] }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
