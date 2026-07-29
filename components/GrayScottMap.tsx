"use client";

import { GS_ZONES, ZONE_LABELS, type GsZone } from "@/lib/grayScottZones";

const ZONE_FILL: Record<GsZone, string> = {
  extinct: "rgba(255,255,255,0.05)",
  uniform: "rgba(255,255,255,0.16)",
  spots: "rgba(120,190,255,0.55)",
  stripes: "rgba(90,240,220,0.6)",
  coral: "rgba(190,150,255,0.5)",
};

/**
 * Where the current feed/kill pair sits in Gray-Scott parameter space.
 *
 * The point of showing this is that the pattern-forming region is a diagonal
 * wedge, not a rectangle — so a student can see that self-organisation only
 * happens in a tuned window, and watch the marker cross out of it. That is the
 * transferable lesson; the blank canvas on its own doesn't teach it.
 *
 * The zone fills come from a pixel-measurement sweep of this app's own
 * simulation, NOT from published Pearson coordinates. The caption says so,
 * because "where did this data come from" is part of what a student should be
 * learning to ask.
 */
export default function GrayScottMap({ feedRate, killRate }: { feedRate: number; killRate: number }) {
  const { fs, ks, grid } = GS_ZONES;
  // Nothing to draw until the zone sweep has been baked in.
  if (fs.length === 0 || ks.length === 0) return null;

  // Plot geometry: killRate along x, feedRate up the y axis (feed ascending
  // upward, so the wedge opens the way it does in the literature's plots).
  const PAD_L = 30;
  const PAD_B = 18;
  const PAD_T = 4;
  const W = 248;
  const H = 150;
  const plotW = W - PAD_L;
  const plotH = H - PAD_B - PAD_T;
  const cw = plotW / ks.length;
  const ch = plotH / fs.length;

  const kMin = ks[0];
  const kMax = ks[ks.length - 1];
  const fMin = fs[0];
  const fMax = fs[fs.length - 1];

  // Marker position, clamped so it stays visible at the extremes.
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const mx = PAD_L + clamp01((killRate - kMin) / (kMax - kMin)) * plotW;
  const my = PAD_T + (1 - clamp01((feedRate - fMin) / (fMax - fMin))) * plotH;

  return (
    <div className="mt-7 border-t border-white/10 pt-5">
      <h4 className="font-mono text-[0.65rem] tracking-[0.22em] text-white/50">
        PARAMETER MAP <span className="ml-1 tracking-normal text-white/40">參數地圖</span>
      </h4>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Gray-Scott parameter map showing where the current feed and kill rates sit relative to the pattern-forming region"
      >
        {fs.map((f, fi) =>
          ks.map((k, ki) => {
            const zone = (grid[`${f}|${k}`] ?? "extinct") as GsZone;
            return (
              <rect
                key={`${f}|${k}`}
                x={PAD_L + ki * cw}
                y={PAD_T + (fs.length - 1 - fi) * ch}
                width={cw + 0.5}
                height={ch + 0.5}
                fill={ZONE_FILL[zone]}
              />
            );
          })
        )}

        {/* axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W} y2={PAD_T + plotH} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

        <text x={PAD_L - 3} y={PAD_T + 4} textAnchor="end" fontSize="5.5" fill="rgba(255,255,255,0.45)">
          {fMax.toFixed(2)}
        </text>
        <text x={PAD_L - 3} y={PAD_T + plotH} textAnchor="end" fontSize="5.5" fill="rgba(255,255,255,0.45)">
          {fMin.toFixed(2)}
        </text>
        <text x={2} y={PAD_T + plotH / 2} fontSize="5.5" fill="rgba(255,255,255,0.35)">
          feed
        </text>
        <text x={PAD_L} y={H - 4} fontSize="5.5" fill="rgba(255,255,255,0.45)">
          {kMin.toFixed(3)}
        </text>
        <text x={W} y={H - 4} textAnchor="end" fontSize="5.5" fill="rgba(255,255,255,0.45)">
          kill {kMax.toFixed(3)}
        </text>

        {/* current position */}
        <circle cx={mx} cy={my} r="4.2" fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="2.4" />
        <circle cx={mx} cy={my} r="4.2" fill="none" stroke="#fff" strokeWidth="1.2" />
        <circle cx={mx} cy={my} r="1.1" fill="#fff" />
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(ZONE_LABELS) as GsZone[]).map((z) => (
          <li key={z} className="flex items-center gap-1.5 text-[0.7rem] text-white/55">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: ZONE_FILL[z], outline: "1px solid rgba(255,255,255,0.15)" }}
            />
            {ZONE_LABELS[z]}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[0.68rem] leading-relaxed text-white/40">
        分區標籤為本模擬之視覺判讀近似結果，非取自文獻座標。若用於研究或報告，請自行核對原始文獻。
      </p>
    </div>
  );
}
