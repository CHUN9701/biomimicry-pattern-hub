"use client";

import { useEffect, useRef, useState } from "react";
import { createGenerator } from "@/lib/generators";
import type { GeneratorInstance, GeneratorStatus } from "@/lib/generators";
import type { SliderConfig } from "@/lib/data";
import {
  SCALE_PARAM_KEY,
  SCALE_TIERS,
  countAcross,
  formatMetres,
  formatMm,
  gridCountsFromPitch,
  heightM,
  pointsInArea,
  scaleBarMetres,
  wavesAcross,
  type ScaleTier,
} from "@/lib/scale";
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

/**
 * Spell out the arithmetic the generator is about to do, in the same terms as
 * the slider. Seeing "5.0m ÷ 100mm = 50 列" is what makes the extent slider
 * legible as a physical statement rather than a zoom control — and each derive
 * kind gets its own sentence because they are genuinely different operations
 * (see the `derive` union in lib/data.ts).
 */
function deriveReadout(
  slider: SliderConfig,
  value: number,
  widthM: number,
  aspect: number
): string {
  if (!Number.isFinite(value)) return "";
  const hM = heightM(widthM, aspect);
  const w = widthM.toFixed(1);
  const h = hM.toFixed(1);
  switch (slider.derive) {
    case "gridPitch": {
      const g = gridCountsFromPitch(widthM, value, aspect);
      return `→ ${w}m ÷ ${value}mm = ${g.cols} 列 × ${g.rows} 排 = ${g.total} 個`;
    }
    case "linePitch":
      return `→ ${w}m ÷ ${value}mm = ${countAcross(widthM, value, 3)} 道（沿寬度）`;
    case "rowPitch":
      return `→ 畫布高 ${h}m ÷ ${value}mm = ${countAcross(hM, value, 1)} 道（沿高度）`;
    case "wavelength": {
      const mm = slider.deriveUnit === "m" ? value * 1000 : value;
      return `→ ${w}m ÷ ${formatMm(mm)} = ${wavesAcross(mm, widthM).toFixed(1)} 個波長／畫布寬`;
    }
    case "areaDensity": {
      const area = widthM * hM;
      return `→ ${value} 點/m² × ${area.toFixed(1)}m² = ${pointsInArea(value, widthM, aspect)} 點`;
    }
    default:
      return "";
  }
}

/**
 * Tick marks sitting under a slider track at the values where behaviour
 * changes. The 8px inset matches half a native range thumb, so a mark at max
 * lands under the thumb's centre rather than past the end of the track.
 */
function SliderTicks({ slider, accent }: { slider: SliderConfig; accent: string }) {
  if (!slider.ticks?.length) return null;
  const span = slider.max - slider.min;
  return (
    <div className="pointer-events-none relative mt-0.5 h-1.5">
      {slider.ticks.map((tick) => (
        <span
          key={tick.at}
          className="absolute top-0 h-1.5 w-px"
          style={{
            left: `calc(8px + ${((tick.at - slider.min) / span) * 100}% - ${
              (((tick.at - slider.min) / span) * 16).toFixed(2)
            }px)`,
            backgroundColor: accent,
          }}
        />
      ))}
    </div>
  );
}

export default function PlaygroundCanvas({
  colors,
  generatorKey,
  sliders,
  params,
  onParamsChange,
  scaleTier,
  scaleNoteZh,
}: {
  colors: [string, string, string, string];
  generatorKey: string;
  sliders: SliderConfig[];
  params: Record<string, number>;
  onParamsChange: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  /** Omitted for types that legitimately have no physical scale (Gray-Scott). */
  scaleTier?: ScaleTier | null;
  /** Says what the extent maps to when it isn't the canvas's width. */
  scaleNoteZh?: string;
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
  // CSS (not device) pixels. The scale bar and the derived row count are both
  // stated in the canvas's own proportions, so they need the laid-out size.
  const [cssSize, setCssSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

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
      setCssSize((prev) =>
        Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height }
      );
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

  // --- physical scale -------------------------------------------------------
  // The tier fixes what this canvas represents; the slider only moves within
  // that tier. Four tiers rather than 48 bespoke widths is what keeps the
  // canvas comparable across types (see lib/scale.ts).
  const tierSpec = scaleTier ? SCALE_TIERS[scaleTier] : null;
  const widthM = tierSpec
    ? Math.min(tierSpec.max, Math.max(tierSpec.min, params[SCALE_PARAM_KEY] ?? tierSpec.defaultM))
    : null;
  const barM = widthM ? scaleBarMetres(widthM) : 0;
  const barPx = widthM && cssSize.w ? (barM / widthM) * cssSize.w : 0;
  const aspect = cssSize.w > 0 ? cssSize.h / cssSize.w : 0.75;

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="flex w-full flex-col gap-3 lg:flex-1">
      <div className="glass-panel relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[28rem] lg:flex-1">
        <canvas ref={canvasRef} className="h-full w-full" />

        {/* Drawn, not merely stated: a number needs mental arithmetic, a bar is
            read at a glance — which is why A4 ranks this first. Only appears
            for types that actually declare a physical extent. */}
        {widthM && barPx > 24 && (
          <div className="pointer-events-none absolute bottom-3 left-3 select-none rounded-md bg-black/65 px-2.5 py-1.5">
            <div className="mb-1 font-mono text-[0.65rem] leading-none tracking-[0.15em] text-white/85">
              {formatMetres(barM)}
            </div>
            <div className="relative h-[7px]" style={{ width: `${barPx}px` }}>
              <span className="absolute bottom-0 left-0 h-full w-px bg-white/85" />
              <span className="absolute bottom-0 right-0 h-full w-px bg-white/85" />
              <span className="absolute bottom-0 left-0 h-px w-full bg-white/85" />
            </div>
          </div>
        )}

        {/* Reaching a patternless parameter combination is a real property of
            the system, not a fault — so name it and offer a way back, rather
            than leaving a flat canvas the student can't tell from a broken
            page. The two states get separate wording because they happen for
            genuinely different reasons. */}
        {status && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 p-6 text-center backdrop-blur-sm">
            <p className="font-mono text-[0.7rem] tracking-[0.25em] text-white/60">
              {status.code === "extinct" ? "PATTERN EXTINGUISHED" : "FIELD WENT UNIFORM"}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              {status.code === "extinct" ? (
                <>
                  反應已滅絕 —— 此參數組合落在圖樣窗口之外。
                  <span className="mt-1 block text-white/55">
                    濃度歸零後是吸收態，拉回滑桿不會自動復原。這是 Gray-Scott
                    系統的真實行為：自組織圖樣只存在於特定的參數區間。
                  </span>
                </>
              ) : (
                <>
                  反應仍在進行，但濃度已均勻化 —— 場中不再有圖樣。
                  <span className="mt-1 block text-white/55">
                    完全均勻的場沒有濃度梯度可供放大，圖樣無法自行重新長出；
                    此時拉動滑桿只會沿著均勻平衡移動，甚至走向滅絕。與「滅絕」
                    的差別在於原因：這裡濃度還在，缺的是空間結構。
                  </span>
                </>
              )}
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

      {/* Deliberately NOT in the PARAMETERS panel: this slider redefines what
          the whole canvas means, rather than adjusting one mechanism inside it.
          Mixing it in with the shaping sliders would read as just another
          parameter. */}
      {tierSpec && widthM !== null && (
        <div className="glass-panel px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="font-mono text-[0.7rem] tracking-[0.2em] text-white/50">
                PHYSICAL EXTENT
              </span>
              <span className="ml-2 text-sm text-white/80">畫布實體寬度</span>
            </div>
            <span className="shrink-0 font-mono text-sm text-white/90 tabular-nums">
              {widthM.toFixed(tierSpec.step < 0.1 ? 2 : 1)} m
            </span>
          </div>
          <input
            aria-label="畫布實體寬度"
            type="range"
            min={tierSpec.min}
            max={tierSpec.max}
            step={tierSpec.step}
            value={widthM}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onParamsChange((prev) => ({ ...prev, [SCALE_PARAM_KEY]: val }));
            }}
            className="range-slider mt-3 w-full"
            style={{ accentColor: colors[3] }}
          />
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            <span className="text-white/70">{tierSpec.labelZh}尺度</span>
            {` · ${tierSpec.hintZh} · 檔位範圍 ${formatMetres(tierSpec.min)}–${formatMetres(
              tierSpec.max
            )}`}
            {/* Only shown where the width isn't the dimension a designer would
                quote — a tower's height, a foundation's depth, a dome's
                diameter. Saying so beats letting the number be misread. */}
            {scaleNoteZh ? (
              <span className="mt-1 block text-white/60">{scaleNoteZh}</span>
            ) : null}
            <span className="mt-1 block">
              四個固定檔位(材料 / 構件 / 空間 / 量體)讓 48 個 type 的畫布維持可互相比較;
              同一檔位內的畫布代表同一種尺度。
            </span>
          </p>
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
              <SliderTicks slider={slider} accent={colors[3]} />

              {/* Ticks are only trustworthy if what they were computed from is
                  stated — otherwise they read as universal constants. */}
              {slider.ticks?.length || slider.ticksNote ? (
                <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">
                  {slider.ticks?.length ? (
                    <span className="text-white/55">
                      {slider.ticks
                        .map((t) => `${t.labelZh} ${t.at}${slider.unit ?? ""}`)
                        .join(" · ")}
                    </span>
                  ) : null}
                  {/* A note can stand alone: geodesic-dome has no thresholds to
                      mark, but its count still needs saying what it is NOT. */}
                  {slider.ticksNote ? (
                    <span className={slider.ticks?.length ? "mt-0.5 block" : "block"}>
                      {slider.ticksNote}
                    </span>
                  ) : null}
                </p>
              ) : null}

              {/* The count the generator actually draws, spelled out. This is
                  the link the physical extent exists to make visible: same
                  pitch, wider wall, more apertures. */}
              {slider.derive && widthM !== null && (
                <p className="mt-1 font-mono text-[0.68rem] leading-relaxed text-white/45">
                  {deriveReadout(slider, params[slider.key], widthM, aspect)}
                </p>
              )}
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
