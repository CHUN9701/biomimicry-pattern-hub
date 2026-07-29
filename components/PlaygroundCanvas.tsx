"use client";

import { useEffect, useRef, useState } from "react";
import { createGenerator } from "@/lib/generators";
import type { GeneratorInstance, GeneratorStatus } from "@/lib/generators";
import type { SliderConfig } from "@/lib/data";
import GrayScottMap from "./GrayScottMap";

/**
 * Show a value at exactly the precision its own step implies: step 1 -> "20",
 * step 0.5 -> "1.5", step 0.001 -> "0.037".
 *
 * Replaces a `Number.isInteger(step) ? value : value.toFixed(3)` check that
 * broke in two ways: when step was missing (as it was for all 144 JSON
 * sliders) isInteger(undefined) is false, so every integer rendered as
 * "20.000"; and a step of 0.5 rendered as "1.500" rather than "1.5".
 */
function formatParamValue(value: number | undefined, step: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  // Decimals needed = digits after the point in `step` (0 for integer steps).
  const decimals = Number.isInteger(step)
    ? 0
    : (step.toString().split(".")[1] ?? "").length;
  return value.toFixed(decimals);
}

export default function PlaygroundCanvas({
  colors,
  generatorKey,
  sliders,
  params,
  onParamsChange,
}: {
  colors: [string, string, string, string];
  generatorKey: string;
  sliders: SliderConfig[];
  params: Record<string, number>;
  onParamsChange: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
}) {
  const hasFeedKill =
    sliders.some((s) => s.key === "feedRate") &&
    sliders.some((s) => s.key === "killRate") &&
    Number.isFinite(params.feedRate) &&
    Number.isFinite(params.killRate);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef<Record<string, number>>(params);
  paramsRef.current = params;
  // Held so the reseed button can reach the running generator instance.
  const generatorRef = useRef<GeneratorInstance | null>(null);
  const [status, setStatus] = useState<GeneratorStatus | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generator = createGenerator(generatorKey);
    generatorRef.current = generator;
    setStatus(null);
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
    let lastPoll = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - start) / 1000;
      generator.draw(ctx, canvas.width, canvas.height, t, paramsRef.current, colors);

      // Poll a few times a second rather than every frame; returning `prev`
      // when nothing changed lets React skip the re-render entirely.
      if (now - lastPoll > 350) {
        lastPoll = now;
        const next = generator.getStatus?.() ?? null;
        setStatus((prev) => (prev?.code === next?.code ? prev : next));
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      generatorRef.current = null;
    };
  }, [generatorKey, colors]);

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="glass-panel relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[28rem] lg:flex-1">
        <canvas ref={canvasRef} className="h-full w-full" />

        {/* Reaching a dead parameter combination is a real property of the
            system, not a fault — so name it and offer a way back, rather than
            leaving a blank canvas the student can't tell from a broken page. */}
        {status?.code === "extinct" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 p-6 text-center backdrop-blur-sm">
            <p className="font-mono text-[0.7rem] tracking-[0.25em] text-white/60">
              PATTERN EXTINGUISHED
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              反應已滅絕 —— 此參數組合落在圖樣窗口之外。
              <span className="mt-1 block text-white/55">
                濃度歸零後是吸收態，拉回滑桿不會自動復原。這是 Gray-Scott
                系統的真實行為：自組織圖樣只存在於特定的參數區間。
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                generatorRef.current?.reset?.();
                setStatus(null);
              }}
              className="rounded-full border border-white/25 px-5 py-2 text-sm text-white/90 transition hover:border-white/50 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              style={{ backgroundColor: `${colors[1]}55` }}
            >
              重新播種 · Reseed
            </button>
          </div>
        )}
      </div>
      <div className="glass-panel w-full shrink-0 p-6 lg:w-80">
        <h3 className="font-mono text-xs tracking-[0.25em] text-white/50">PARAMETERS</h3>
        <div className="mt-5 flex flex-col gap-6">
          {sliders.map((slider) => (
            <div key={slider.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3 text-sm text-white/80">
                <label htmlFor={slider.key} className="min-w-0">
                  {slider.label}
                  {slider.labelZh && (
                    <span className="ml-1.5 text-xs text-white/45">{slider.labelZh}</span>
                  )}
                </label>
                <span className="shrink-0 font-mono text-xs text-white/50 tabular-nums">
                  {formatParamValue(params[slider.key], slider.step)}
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
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onParamsChange((prev) => ({ ...prev, [slider.key]: val }));
                }}
                className="range-slider w-full"
                style={{ accentColor: colors[2] }}
              />
            </div>
          ))}
        </div>

        {/* Only the Gray-Scott types carry both of these, so the map appears
            exactly where it means something and nowhere else. */}
        {hasFeedKill && (
          <GrayScottMap feedRate={params.feedRate} killRate={params.killRate} />
        )}
      </div>
    </div>
  );
}
