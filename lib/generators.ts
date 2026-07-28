import { clamp, lerpColor, mulberry32, rgba } from "./canvasUtils";

export type Palette = [string, string, string, string];
export type GenParams = Record<string, number>;

export interface GeneratorInstance {
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    params: GenParams,
    palette: Palette
  ): void;
}

type Factory = () => GeneratorInstance;

// ---------------------------------------------------------------------------
// 01A Static Shading Perforated Skin
// ---------------------------------------------------------------------------
const selfShadingSkin: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = Math.round(p.density);
    const rows = Math.max(2, Math.round(p.density * (h / w)));
    const cellW = w / cols;
    const cellH = h / rows;
    const angleRad = (p.sunAngle / 180) * Math.PI;
    const apertureFactor = 0.25 + 0.55 * (p.sunAngle / 90);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const shimmer = 1 + 0.04 * Math.sin(t * 0.6 + col * 0.9 + row * 1.3);
        const r = Math.min(cellW, cellH) * 0.5 * apertureFactor * shimmer;

        const offsetX = Math.cos(angleRad) * cellW * (p.shadowDepth / 100) * 0.6;
        const offsetY = cellH * (p.shadowDepth / 100) * 0.5;

        ctx.beginPath();
        ctx.ellipse(cx + offsetX * 0.4, cy + offsetY * 0.5, r * 1.15, r * 0.65, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(palette[2], palette[3], (row + col) / (rows + cols));
        ctx.fill();
      }
    }
  },
});

// ---------------------------------------------------------------------------
// 01B / 02B Thermal Mass Undulation & Shape-Memory Membrane share a "ribbon" look
// ---------------------------------------------------------------------------
const thermalMassUndulation: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const tempNorm = clamp((p.temperature + 10) / 55, 0, 1);
    const rows = 9;
    const rowH = h / rows;
    const amp = (p.reliefDepth / 100) * rowH * 0.9;

    for (let row = 0; row < rows; row++) {
      const phase = t * 0.35 + row * (p.thermalLag / 100) * 1.6;
      const rowT = clamp(tempNorm + (row / rows - 0.5) * 0.3, 0, 1);
      const color = lerpColor(palette[0], palette[3], rowT);

      ctx.beginPath();
      ctx.moveTo(0, row * rowH + rowH * 0.5);
      for (let x = 0; x <= w; x += 6) {
        const y = row * rowH + rowH * 0.5 + Math.sin(x * 0.018 + phase) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, (row + 1) * rowH);
      ctx.lineTo(0, (row + 1) * rowH);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
});

// ---------------------------------------------------------------------------
// 02A Kinetic Folding Petals
// ---------------------------------------------------------------------------
const kineticFoldingPetals: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.38;
    const count = Math.round(p.petalCount);

    for (let i = 0; i < count; i++) {
      const baseAngle = (i * (2 * Math.PI)) / count;
      const windPhase = Math.sin(t * (0.5 + p.windSpeed * 0.06) + i * 0.8);
      const fold = clamp(p.foldAngle + windPhase * p.windSpeed * 1.4, 0, 90);
      const foldRad = (fold / 180) * Math.PI;
      const closeAmount = Math.cos(foldRad);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(baseAngle);
      ctx.scale(1, Math.max(0.15, closeAmount));

      const grad = ctx.createLinearGradient(0, 0, R, 0);
      grad.addColorStop(0, lerpColor(palette[1], palette[3], i / count));
      grad.addColorStop(1, palette[2]);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.5, R * 0.22, R, 0);
      ctx.quadraticCurveTo(R * 0.5, -R * 0.22, 0, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = palette[0];
    ctx.fill();
  },
});

// ---------------------------------------------------------------------------
// Shape-memory membrane: grid of curling strips
// ---------------------------------------------------------------------------
const shapeMemoryMembrane: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = 10;
    const rows = 6;
    const cellW = w / cols;
    const cellH = h / rows;
    const tempNorm = clamp((p.temperature + 10) / 55, 0, 1);
    const curlNorm = p.curl / 100;
    const stiffnessDamp = 1 - p.stiffness / 140;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const wobble = Math.sin(t * 0.5 + row * 0.6 + col * 0.4) * 0.06;
        const curlAmount = clamp((tempNorm * 0.6 + curlNorm * 0.4 + wobble) * stiffnessDamp, 0, 1);
        const curlRad = curlAmount * Math.PI * 0.9;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        const strips = 6;
        for (let s = 0; s <= strips; s++) {
          const a = (s / strips) * curlRad - curlRad / 2;
          const rr = cellH * 0.45;
          const x = Math.sin(a) * rr;
          const y = -Math.cos(a) * rr + rr;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lerpColor(palette[1], palette[3], tempNorm);
        ctx.lineWidth = cellW * 0.5;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      }
    }
  },
});

// ---------------------------------------------------------------------------
// 03-01 Voronoi Tessellation
// ---------------------------------------------------------------------------
const voronoi: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    const n = Math.round(p.cellCount);
    const rand = mulberry32(Math.floor(n * 977 + p.jitter * 31));
    const seeds: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) seeds.push({ x: rand(), y: rand() });

    const jitterAmt = p.jitter / 100;
    const pts = seeds.map((s, i) => ({
      x: (s.x + Math.sin(t * 0.15 + i) * 0.02 * jitterAmt) * w,
      y: (s.y + Math.cos(t * 0.15 + i * 1.3) * 0.02 * jitterAmt) * h,
    }));

    const step = 6;
    ctx.clearRect(0, 0, w, h);
    for (let gy = 0; gy < h; gy += step) {
      for (let gx = 0; gx < w; gx += step) {
        let best = 0;
        let bestD = Infinity;
        let secondD = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const dx = pts[i].x - gx;
          const dy = pts[i].y - gy;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            secondD = bestD;
            bestD = d;
            best = i;
          } else if (d < secondD) {
            secondD = d;
          }
        }
        const edge = Math.sqrt(secondD) - Math.sqrt(bestD);
        const isEdge = edge < p.lineWidth * 3;
        ctx.fillStyle = isEdge
          ? "rgba(0,0,0,0.55)"
          : lerpColor(palette[1], palette[3], (best % 7) / 7);
        ctx.fillRect(gx, gy, step, step);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// 03-02 Fibonacci Spiral
// ---------------------------------------------------------------------------
const fibonacci: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.pointCount);
    const goldenAngle = ((137.5 + p.angleOffset) / 180) * Math.PI;
    const maxR = Math.min(w, h) * 0.46;

    for (let i = 0; i < count; i++) {
      const r = (p.growthRate * Math.sqrt(i) * maxR) / (p.growthRate * Math.sqrt(count));
      const a = i * goldenAngle + t * 0.05;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const size = 1.5 + (i / count) * 4;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[1], palette[3], i / count);
      ctx.fill();
    }
  },
});

// ---------------------------------------------------------------------------
// 03-03 Fractal Tree
// ---------------------------------------------------------------------------
const fractalTree: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.depth);
    const angleRad = (p.branchAngle / 180) * Math.PI;

    const branch = (x: number, y: number, len: number, angle: number, depth: number) => {
      if (depth <= 0 || len < 2) return;
      const sway = Math.sin(t * 0.6 + depth * 1.3) * 0.06 * (maxDepth - depth + 1);
      const a = angle + sway;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[1], palette[3], 1 - depth / maxDepth);
      ctx.lineWidth = Math.max(1, depth * 0.9);
      ctx.lineCap = "round";
      ctx.stroke();

      branch(x2, y2, len * p.lengthRatio, a - angleRad, depth - 1);
      branch(x2, y2, len * p.lengthRatio, a + angleRad, depth - 1);
    };

    branch(w / 2, h * 0.95, h * 0.22, -Math.PI / 2, maxDepth);
  },
});

// ---------------------------------------------------------------------------
// 03-04 Reaction-Diffusion (Gray-Scott)
// ---------------------------------------------------------------------------
const reactionDiffusion: Factory = () => {
  const GW = 120;
  const GH = 90;
  const N = GW * GH;
  let U = new Float32Array(N).fill(1);
  let V = new Float32Array(N).fill(0);
  let Un = new Float32Array(N);
  let Vn = new Float32Array(N);
  let seeded = false;
  let off: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let imgData: ImageData | null = null;

  const idx = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= GW ? GW - 1 : x;
    const cy = y < 0 ? 0 : y >= GH ? GH - 1 : y;
    return cy * GW + cx;
  };

  const seed = () => {
    const rand = mulberry32(42);
    for (let s = 0; s < 6; s++) {
      const sx = Math.floor(rand() * GW);
      const sy = Math.floor(rand() * GH);
      for (let y = sy - 3; y <= sy + 3; y++) {
        for (let x = sx - 3; x <= sx + 3; x++) {
          V[idx(x, y)] = 1;
        }
      }
    }
    seeded = true;
  };

  return {
    draw(ctx, w, h, t, p, palette) {
      if (!seeded) seed();
      if (!off) {
        off = document.createElement("canvas");
        off.width = GW;
        off.height = GH;
        offCtx = off.getContext("2d");
        imgData = offCtx?.createImageData(GW, GH) ?? null;
      }

      const f = p.feedRate;
      const k = p.killRate;
      const iterations = Math.max(1, Math.round(p.diffusionSpeed));

      for (let iter = 0; iter < iterations; iter++) {
        for (let y = 0; y < GH; y++) {
          for (let x = 0; x < GW; x++) {
            const i = y * GW + x;
            const u = U[i];
            const v = V[i];
            const lapU =
              U[idx(x - 1, y)] + U[idx(x + 1, y)] + U[idx(x, y - 1)] + U[idx(x, y + 1)] - 4 * u;
            const lapV =
              V[idx(x - 1, y)] + V[idx(x + 1, y)] + V[idx(x, y - 1)] + V[idx(x, y + 1)] - 4 * v;
            const uvv = u * v * v;
            Un[i] = clamp(u + (1.0 * lapU - uvv + f * (1 - u)) * 1.0, 0, 1);
            Vn[i] = clamp(v + (0.5 * lapV + uvv - (f + k) * v) * 1.0, 0, 1);
          }
        }
        [U, Un] = [Un, U];
        [V, Vn] = [Vn, V];
      }

      if (imgData && offCtx && off) {
        const data = imgData.data;
        for (let i = 0; i < N; i++) {
          const val = clamp(U[i] - V[i], 0, 1);
          const color = lerpColor(palette[0], palette[3], 1 - val);
          const m = color.match(/[\d.]+/g);
          const r = m ? +m[0] : 0;
          const g = m ? +m[1] : 0;
          const b = m ? +m[2] : 0;
          data[i * 4] = r;
          data[i * 4 + 1] = g;
          data[i * 4 + 2] = b;
          data[i * 4 + 3] = 255;
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(off, 0, 0, GW, GH, 0, 0, w, h);
      }
    },
  };
};

// ---------------------------------------------------------------------------
// 03-05 Vein Flow (space colonization)
// ---------------------------------------------------------------------------
const veinFlow: Factory = () => {
  type Node = { x: number; y: number; parent: number };
  let attractors: { x: number; y: number }[] = [];
  let nodes: Node[] = [];
  let lastDensity = -1;

  const reseed = (w: number, h: number, density: number) => {
    const rand = mulberry32(Math.floor(density * 97 + 7));
    attractors = [];
    for (let i = 0; i < density; i++) {
      attractors.push({ x: rand() * w, y: rand() * h * 0.92 });
    }
    nodes = [
      { x: w * 0.5, y: h * 0.98, parent: -1 },
      { x: w * 0.3, y: h * 0.99, parent: -1 },
      { x: w * 0.7, y: h * 0.99, parent: -1 },
    ];
    lastDensity = density;
  };

  return {
    draw(ctx, w, h, t, p, palette) {
      if (Math.abs(p.density - lastDensity) > 0.5 || nodes.length === 0) {
        reseed(w, h, p.density);
      }

      const influenceR = Math.max(w, h) * 0.18;
      const killR = Math.max(w, h) * 0.035;
      const stepLen = 5 + p.branchProbability * 0.03;
      const iterations = Math.max(1, Math.round(p.growthSpeed / 2));

      for (let iter = 0; iter < iterations && nodes.length < 900; iter++) {
        const pulls = new Map<number, { dx: number; dy: number; n: number }>();

        for (const a of attractors) {
          let bestI = -1;
          let bestD = influenceR;
          for (let i = 0; i < nodes.length; i++) {
            const dx = a.x - nodes[i].x;
            const dy = a.y - nodes[i].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) {
              bestD = d;
              bestI = i;
            }
          }
          if (bestI >= 0) {
            const dx = a.x - nodes[bestI].x;
            const dy = a.y - nodes[bestI].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const cur = pulls.get(bestI) ?? { dx: 0, dy: 0, n: 0 };
            cur.dx += dx / d;
            cur.dy += dy / d;
            cur.n += 1;
            pulls.set(bestI, cur);
          }
        }

        const newNodes: Node[] = [];
        pulls.forEach((v, i) => {
          const dx = v.dx / v.n;
          const dy = v.dy / v.n;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          newNodes.push({
            x: nodes[i].x + (dx / d) * stepLen,
            y: nodes[i].y + (dy / d) * stepLen,
            parent: i,
          });
        });
        for (const n of newNodes) nodes.push(n);

        attractors = attractors.filter((a) => {
          for (const n of nodes) {
            const dx = a.x - n.x;
            const dy = a.y - n.y;
            if (dx * dx + dy * dy < killR * killR) return false;
          }
          return true;
        });
      }

      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.parent < 0) continue;
        const parent = nodes[n.parent];
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = lerpColor(palette[1], palette[3], i / Math.max(1, nodes.length));
        ctx.lineWidth = Math.max(0.6, 2.4 * (1 - i / Math.max(1, nodes.length)));
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.fillStyle = rgba(palette[3], 0.5);
      for (const a of attractors) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
};

// ---------------------------------------------------------------------------
// 03-06 Structural Geometry
// ---------------------------------------------------------------------------
const structuralGeometry: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.round(p.gridDensity);
    const cellW = w / n;
    const cellH = h / n;
    const angleRad = (p.loadAngle / 180) * Math.PI;
    const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    const cx = w / 2;
    const cy = h / 2;

    const displace = (x: number, y: number) => {
      const rx = x - cx;
      const ry = y - cy;
      const proj = rx * dir.x + ry * dir.y;
      const dist = Math.sqrt(rx * rx + ry * ry) || 1;
      const falloff = Math.exp(-((dist / (Math.min(w, h) * 0.5)) ** 2));
      const mag = Math.sin(proj * 0.04 + t * 0.4) * falloff * cellW * 0.35;
      return { x: x + dir.y * mag, y: y - dir.x * mag, stress: Math.abs(mag) };
    };

    const grid: { x: number; y: number; stress: number }[][] = [];
    for (let j = 0; j <= n; j++) {
      const row = [];
      for (let i = 0; i <= n; i++) {
        row.push(displace(i * cellW, j * cellH));
      }
      grid.push(row);
    }

    ctx.lineWidth = p.memberThickness;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const node = grid[j][i];
        const stressT = clamp(node.stress / (cellW * 0.35), 0, 1);
        ctx.strokeStyle = lerpColor(palette[1], palette[3], stressT);
        if (i < n) {
          const right = grid[j][i + 1];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
        if (j < n) {
          const down = grid[j + 1][i];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(down.x, down.y);
          ctx.stroke();
        }
        if (i < n && j < n) {
          const diag = grid[j + 1][i + 1];
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(diag.x, diag.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  },
});

// ---------------------------------------------------------------------------
// 04A Organic Spatial Boundary
// ---------------------------------------------------------------------------
const organicBoundary: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const bands = 6;
    const curveAmt = (p.curvature / 100) * w * 0.25;

    for (let b = 0; b < bands; b++) {
      const bx = (w / bands) * b + w / bands / 2;
      const phase = t * 0.2 + b * 0.9;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.bezierCurveTo(
        bx + Math.sin(phase) * curveAmt,
        h * 0.33,
        bx - Math.sin(phase * 1.3) * curveAmt,
        h * 0.66,
        bx + Math.sin(phase * 0.7) * curveAmt * 0.6,
        h
      );
      ctx.lineWidth = w / bands / (1 + p.porosity / 60);
      ctx.strokeStyle = rgba(lerpColor(palette[1], palette[2], b / bands), 0.85);
      ctx.stroke();
    }

    const lightRad = (p.lightAngle / 180) * Math.PI;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const offset = (i - 2) * w * 0.18 + Math.sin(t * 0.3 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + Math.cos(lightRad) * h, Math.sin(lightRad) * h);
      ctx.lineWidth = 14;
      ctx.strokeStyle = rgba(palette[3], 0.12 * (p.porosity / 100 + 0.2));
      ctx.stroke();
    }
    ctx.restore();
  },
});

// ---------------------------------------------------------------------------
// 04B Sensory Healing Pattern
// ---------------------------------------------------------------------------
const sensoryHealingPattern: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.save();
    ctx.filter = `blur(${(p.softness / 100) * 26}px)`;
    ctx.clearRect(0, 0, w, h);
    const blobCount = 7;
    const scale = p.patternScale;

    for (let i = 0; i < blobCount; i++) {
      const speed = 0.05 + (i % 3) * 0.02;
      const x = w / 2 + Math.sin(t * speed + i * 1.4) * w * 0.32;
      const y = h / 2 + Math.cos(t * speed * 0.8 + i * 2.1) * h * 0.32;
      const r = (Math.min(w, h) / (blobCount - i * 0.3)) * (scale / 4 + 0.6);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      const color = lerpColor(palette[i % 2 === 0 ? 1 : 2], palette[3], (i / blobCount) * (p.calmFactor / 100 + 0.3));
      grad.addColorStop(0, rgba(color, 0.55));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ---------------------------------------------------------------------------
// Mechanism-type generators for the split-screen explorer — each reads the
// same three universal params: sunAngle (0-180°), windSpeed (0-30 m/s),
// textureScale (5-100%).
// ---------------------------------------------------------------------------

// Shared wind-cue helper for the 4 universal Framework 1 generators below.
// A cos/sin offset vector alone can't carry "wind strength" legibly (see the
// drawWindStreaks call sites for why); this renders horizontal streaks whose
// travel speed AND opacity both scale with windSpeed, giving two independent,
// readable cues (motion speed + color depth) instead of one subtle wobble.
function drawWindStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  windSpeed: number,
  color: string
) {
  const streakCount = 6;
  const speed = 20 + windSpeed * 8;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < streakCount; i++) {
    const yBase = (h / streakCount) * (i + 0.5);
    const xOffset = ((t * speed + i * 80) % (w + 120)) - 60;
    ctx.beginPath();
    ctx.moveTo(xOffset, yBase);
    ctx.lineTo(xOffset + 40, yBase);
    ctx.stroke();
  }
  ctx.restore();
}

// Static Shading Type — e.g. coral, cactus ridges: fixed apertures whose size
// is set by texture scale, self-shadowed in the direction of the light.
const staticShading: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = Math.max(4, Math.round(6 + (p.textureScale / 100) * 30));
    const rows = Math.max(2, Math.round(cols * (h / w)));
    const cellW = w / cols;
    const cellH = h / rows;
    const angleRad = (p.sunAngle / 180) * Math.PI;
    const shimmerSpeed = 0.3 + p.windSpeed * 0.03;

    // cos(angleRad)/sin(angleRad) alone would keep the offset vector's
    // length ~constant (cos²+sin²=1) — the shadow only spun in place as
    // sunAngle changed, never visibly lengthened or shortened, which
    // doesn't match how real shadows behave (low sun = long shadow, high
    // sun = short shadow). elevationFactor scales the offset AND stretches
    // the shadow ellipse itself so length is legible, not just direction.
    const elevationFactor = 1 - Math.sin(angleRad);
    const shadowLength = Math.min(cellW, cellH) * (0.12 + elevationFactor * 0.65);
    const shadowStretch = 1 + elevationFactor * 1.8;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const shimmer = 1 + 0.05 * Math.sin(t * shimmerSpeed + col * 0.9 + row * 1.3);
        const r = Math.min(cellW, cellH) * 0.5 * 0.55 * shimmer;
        const offsetX = Math.cos(angleRad) * shadowLength;
        const offsetY = Math.sin(angleRad) * shadowLength * (cellH / cellW);

        ctx.beginPath();
        ctx.ellipse(cx + offsetX * 0.5, cy + offsetY * 0.5, r * 1.15 * shadowStretch, r * 0.65, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(palette[2], palette[3], (row + col) / (rows + cols));
        ctx.fill();
      }
    }

    const windOpacity = clamp(0.08 + (p.windSpeed / 30) * 0.3, 0, 0.38);
    drawWindStreaks(ctx, w, h, t, p.windSpeed, rgba(palette[3], windOpacity));
  },
});

// Kinetic / Climate-Responsive Type — e.g. Al Bahar Towers, pangolin-inspired
// panels: petals fold/unfold in real time in response to wind, resting more
// open under stronger light.
const kineticResponsive: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.38;
    const count = Math.max(5, Math.round(6 + (p.textureScale / 100) * 12));
    const baseFold = (p.sunAngle / 180) * 90;

    for (let i = 0; i < count; i++) {
      const baseAngle = (i * (2 * Math.PI)) / count;
      const windPhase = Math.sin(t * (0.5 + p.windSpeed * 0.06) + i * 0.8);
      const fold = clamp(baseFold + windPhase * p.windSpeed * 1.4, 0, 90);
      const foldRad = (fold / 180) * Math.PI;
      const closeAmount = Math.cos(foldRad);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(baseAngle);
      ctx.scale(1, Math.max(0.15, closeAmount));

      const grad = ctx.createLinearGradient(0, 0, R, 0);
      grad.addColorStop(0, lerpColor(palette[1], palette[3], i / count));
      grad.addColorStop(1, palette[2]);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.5, R * 0.22, R, 0);
      ctx.quadraticCurveTo(R * 0.5, -R * 0.22, 0, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = palette[0];
    ctx.fill();

    const windOpacity = clamp(0.08 + (p.windSpeed / 30) * 0.3, 0, 0.38);
    drawWindStreaks(ctx, w, h, t, p.windSpeed, rgba(palette[3], windOpacity));
  },
});

// Graded Porosity Type — e.g. Esplanade spines, shell spiral porosity: a pore
// field whose size grades continuously along the light direction axis.
const gradedPorosity: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const angleRad = (p.sunAngle / 180) * Math.PI;
    const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    const baseSize = 4 + (p.textureScale / 100) * 26;
    const cell = Math.max(10, baseSize * 0.9);
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const jitterAmt = 0.15 + p.windSpeed * 0.01;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cell + cell / 2 + Math.sin(t * 0.4 + row) * jitterAmt * cell * 0.2;
        const cy = row * cell + cell / 2 + Math.cos(t * 0.4 + col) * jitterAmt * cell * 0.2;
        const proj = (cx / w) * dir.x + (cy / h) * dir.y;
        const grade = clamp((proj + 1) / 2, 0, 1);
        const r = baseSize * (0.25 + grade * 0.9) * 0.5;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(palette[1], palette[3], grade);
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const windOpacity = clamp(0.08 + (p.windSpeed / 30) * 0.3, 0, 0.38);
    drawWindStreaks(ctx, w, h, t, p.windSpeed, rgba(palette[3], windOpacity));
  },
});

// Layered / Overlapping Type — e.g. pangolin scales: overlapping scale rows
// that catch a directional highlight and lift in a wind-driven ripple.
const layeredOverlapping: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const scaleSize = 10 + (p.textureScale / 100) * 40;
    const rows = Math.ceil(h / (scaleSize * 0.6)) + 1;
    const cols = Math.ceil(w / scaleSize) + 2;
    const lightRad = (p.sunAngle / 180) * Math.PI;
    const waveSpeed = 0.3 + p.windSpeed * 0.05;

    for (let row = 0; row < rows; row++) {
      const rowOffset = (row % 2) * (scaleSize * 0.5);
      for (let col = -1; col < cols; col++) {
        const cx = col * scaleSize + rowOffset;
        const cy = row * scaleSize * 0.6;
        const wave = Math.sin(t * waveSpeed - row * 0.5 + col * 0.3);
        const lift = Math.max(0, wave) * 6 * (0.3 + p.windSpeed * 0.03);
        const shade = clamp(0.5 + 0.5 * Math.cos(lightRad - row * 0.15), 0, 1);

        ctx.beginPath();
        ctx.ellipse(cx + scaleSize / 2, cy + scaleSize / 2 - lift, scaleSize * 0.55, scaleSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(palette[1], palette[3], shade);
        ctx.strokeStyle = rgba(palette[0], 0.4);
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      }
    }

    const windOpacity = clamp(0.08 + (p.windSpeed / 30) * 0.3, 0, 0.38);
    drawWindStreaks(ctx, w, h, t, p.windSpeed, rgba(palette[3], windOpacity));
  },
});

// ---------------------------------------------------------------------------
// Climate-Responsive Shape-Memory Membrane generators — universal params:
// temperature (-10 to 60°C), humidity (0-100%), pressure (0-100% inflation).
// Each type mainly reacts to the one stimulus its real mechanism responds to.
// ---------------------------------------------------------------------------

// Shape Memory Alloy (SMA) Type — a grid of alloy strips that curl as they
// heat through their phase-transformation temperature.
const shapeMemoryAlloy: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = 10;
    const rows = 6;
    const cellW = w / cols;
    const cellH = h / rows;
    const tempNorm = clamp((p.temperature + 10) / 70, 0, 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const wobble = Math.sin(t * 0.5 + row * 0.6 + col * 0.4) * 0.05;
        const curlAmount = clamp(tempNorm + wobble, 0, 1);
        const curlRad = curlAmount * Math.PI * 0.9;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        const strips = 6;
        for (let s = 0; s <= strips; s++) {
          const a = (s / strips) * curlRad - curlRad / 2;
          const rr = cellH * 0.45;
          const x = Math.sin(a) * rr;
          const y = -Math.cos(a) * rr + rr;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lerpColor(palette[1], palette[3], tempNorm);
        ctx.lineWidth = cellW * 0.5;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      }
    }
  },
});

// Hygromorphic Membrane Type — wood-fiber composite slats that bow sideways
// as humidity rises, grain lines included for the material read.
const hygromorphicMembrane: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = 8;
    const rows = 5;
    const cellW = w / cols;
    const cellH = h / rows;
    const humidityNorm = clamp(p.humidity / 100, 0, 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = col * cellW + cellW / 2;
        const topY = row * cellH + cellH * 0.1;
        const bottomY = row * cellH + cellH * 0.9;
        const sway = Math.sin(t * 0.4 + row * 0.5 + col * 0.3) * 0.12;
        const bend = clamp(humidityNorm + sway, 0, 1) * cellW * 0.4;
        const midY = (topY + bottomY) / 2;

        ctx.beginPath();
        ctx.moveTo(baseX - cellW * 0.3, topY);
        ctx.quadraticCurveTo(baseX - cellW * 0.3 + bend, midY, baseX - cellW * 0.3, bottomY);
        ctx.lineTo(baseX + cellW * 0.3, bottomY);
        ctx.quadraticCurveTo(baseX + cellW * 0.3 + bend, midY, baseX + cellW * 0.3, topY);
        ctx.closePath();
        ctx.fillStyle = lerpColor(palette[1], palette[2], row / rows);
        ctx.fill();

        ctx.strokeStyle = rgba(palette[0], 0.35);
        ctx.lineWidth = 1;
        for (let g = 1; g < 4; g++) {
          const gx = baseX - cellW * 0.3 + (cellW * 0.6 * g) / 4;
          ctx.beginPath();
          ctx.moveTo(gx, topY);
          ctx.quadraticCurveTo(gx + bend, midY, gx, bottomY);
          ctx.stroke();
        }
      }
    }
  },
});

// Bimetallic / Thermobimetal Type — laminated horizontal strips that tilt like
// louvres as they heat, each rendered as two bonded colour bands.
const bimetallicStrip: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const rows = 10;
    const rowH = h / rows;
    const tempNorm = clamp((p.temperature + 10) / 70, 0, 1);
    const cx = w / 2;
    const len = w * 0.92;

    for (let row = 0; row < rows; row++) {
      const cy = row * rowH + rowH / 2;
      const wobble = Math.sin(t * 0.5 + row * 0.7) * 0.05;
      const tilt = clamp(tempNorm + wobble, 0, 1) * (Math.PI / 2.4) - Math.PI / 4.8;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.fillStyle = lerpColor(palette[1], palette[3], tempNorm);
      ctx.fillRect(-len / 2, -rowH * 0.22, len, rowH * 0.22);
      ctx.fillStyle = rgba(palette[0], 0.55);
      ctx.fillRect(-len / 2, 0, len, rowH * 0.18);
      ctx.restore();
    }
  },
});

// Pneumatic Responsive Membrane Type — a grid of inflatable cushions that puff
// up and brighten as internal pressure rises, like an ETFE pillow facade.
const pneumaticMembrane: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cols = 5;
    const rows = 4;
    const cellW = w / cols;
    const cellH = h / rows;
    const pressureNorm = clamp(p.pressure / 100, 0, 1);
    const pad = Math.min(cellW, cellH) * 0.08;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const breathe = 1 + 0.03 * Math.sin(t * 0.8 + row + col);
        const inflate = (0.35 + pressureNorm * 0.55) * breathe;
        const rw = (cellW / 2 - pad) * (0.7 + inflate * 0.3);
        const rh = (cellH / 2 - pad) * (0.7 + inflate * 0.3);

        const grad = ctx.createRadialGradient(cx - rw * 0.3, cy - rh * 0.3, 1, cx, cy, Math.max(rw, rh));
        grad.addColorStop(0, lerpColor(palette[3], "#ffffff", 0.15 + inflate * 0.25));
        grad.addColorStop(1, lerpColor(palette[1], palette[2], 1 - inflate));

        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = rgba(palette[0], 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  },
});

// ---------------------------------------------------------------------------
// CellularLattice engine — shared grid-iteration helper for the
// self-shading-skin subcategory's 4 types (biomimicry-subcategories.json).
// Each type below is a thin per-cell renderer reusing this same iteration
// logic, rather than a from-scratch grid implementation.
// ---------------------------------------------------------------------------
function forEachApertureCell(
  w: number,
  h: number,
  density: number,
  cb: (
    cx: number,
    cy: number,
    cellW: number,
    cellH: number,
    row: number,
    col: number,
    rows: number,
    cols: number
  ) => void
) {
  const cols = Math.max(4, Math.round(density));
  const rows = Math.max(2, Math.round(cols * (h / w)));
  const cellW = w / cols;
  const cellH = h / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;
      cb(cx, cy, cellW, cellH, row, col, rows, cols);
    }
  }
}

// Fixed Aperture Grid Type — apertures stay a constant size; only the
// direction/length of their cast shadow reacts to sun angle.
const fixedApertureGrid: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const angleRad = (p.sunAngle / 180) * Math.PI;
    forEachApertureCell(w, h, p.apertureDensity, (cx, cy, cellW, cellH, row, col, rows, cols) => {
      const shimmer = 1 + 0.03 * Math.sin(t * 0.5 + col * 0.9 + row * 1.3);
      const r = Math.min(cellW, cellH) * 0.5 * (p.apertureSize / 100) * shimmer;
      const offsetX = Math.cos(angleRad) * cellW * 0.5;
      const offsetY = Math.sin(angleRad) * cellH * 0.5;

      ctx.beginPath();
      ctx.ellipse(cx + offsetX * 0.4, cy + offsetY * 0.4, r * 1.15, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[2], palette[3], (row + col) / (rows + cols));
      ctx.fill();
    });
  },
});

// Deep-Well Shadow Type — apertures recede into concentric dark rings; the
// well floor only brightens as the sun climbs toward zenith.
const deepWellShadow: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const angleRad = (p.sunAngle / 180) * Math.PI;
    const depth = clamp(p.wellDepth / 100, 0, 1);
    const noonFactor = Math.sin(angleRad);

    forEachApertureCell(w, h, p.apertureDensity, (cx, cy, cellW, cellH, row, col) => {
      const shimmer = 1 + 0.03 * Math.sin(t * 0.5 + col * 0.9 + row * 1.3);
      const r = Math.min(cellW, cellH) * 0.42 * shimmer;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fill();

      const rings = 1 + Math.round(depth * 3);
      for (let ring = rings; ring >= 1; ring--) {
        const ringR = r * (1 - ring / (rings + 1));
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${0.75 - ring * 0.12})`;
        ctx.fill();
      }

      const floorR = r * Math.max(0.08, (1 - depth) * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, floorR, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[0], palette[3], noonFactor);
      ctx.globalAlpha = 0.3 + noonFactor * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  },
});

// Directional Louver Aperture Type — slit-shaped apertures rotated to one
// azimuth, only letting light through within their own narrow angle range.
const directionalLouverAperture: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const angleRad = (p.louverAngle / 180) * Math.PI;
    const slitFrac = clamp(p.slitWidth / 100, 0.05, 1);

    forEachApertureCell(w, h, p.apertureDensity, (cx, cy, cellW, cellH, row, col) => {
      const wobble = Math.sin(t * 0.4 + row * 0.6 + col * 0.3) * 0.02;
      const len = Math.min(cellW, cellH) * 0.85;
      const thick = Math.min(cellW, cellH) * 0.5 * slitFrac;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad + wobble);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-len / 2, -thick * 0.6, len, thick * 0.6);
      ctx.fillStyle = lerpColor(palette[2], palette[3], (row + col) / 20);
      ctx.fillRect(-len / 2, 0, len, thick * 0.4);
      ctx.restore();
    });
  },
});

// Graduated Pinhole Type — a dense pinhole field whose size grades
// continuously along one direction (reuses the Graded Porosity gradient math).
const graduatedPinhole: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const angleRad = (p.gradientAngle / 180) * Math.PI;
    const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    const contrast = clamp(p.contrastRange / 100, 0, 1);

    forEachApertureCell(w, h, p.pinholeDensity, (cx, cy, cellW, cellH, row, col) => {
      const proj = (cx / w) * dir.x + (cy / h) * dir.y;
      const grade = clamp((proj + 1) / 2, 0, 1);
      const jitter = 1 + 0.05 * Math.sin(t * 0.5 + row + col);
      const r = Math.min(cellW, cellH) * 0.5 * (0.08 + grade * contrast) * jitter;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[1], palette[3], grade);
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  },
});

// ---------------------------------------------------------------------------
// WaveContour engine — shared periodic-contour primitive for the
// thermal-mass-undulation subcategory's 4 mechanism types. Draws one filled
// band whose top edge follows a shaped sine (sharpness blends toward a
// triangle wave), with an optional high-frequency "detail" wobble layered on
// for organic irregularity.
// ---------------------------------------------------------------------------
function drawWaveBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  midY: number,
  bottomY: number,
  amp: number,
  phase: number,
  freq: number,
  sharpness: number,
  detail = 0
) {
  ctx.beginPath();
  ctx.moveTo(0, midY);
  for (let x = 0; x <= w; x += 6) {
    const raw = Math.sin(x * freq + phase);
    const shaped = sharpness > 0 ? Math.sign(raw) * Math.pow(Math.abs(raw), 1 - sharpness * 0.7) : raw;
    const fine = detail > 0 ? Math.sin(x * freq * 2.7 + phase * 1.6) * detail : 0;
    ctx.lineTo(x, midY + shaped * amp + fine * amp);
  }
  ctx.lineTo(w, bottomY);
  ctx.lineTo(0, bottomY);
  ctx.closePath();
}

const waveSectionWall: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const rows = clamp(Math.round(11 - p.wallThickness), 5, 10);
    const rowH = h / rows;
    const ampFactor = 0.4 + (p.tempSwing / 25) * 1.2;
    const amp = rowH * 0.85 * (p.waveAmplitude / 100) * ampFactor;

    for (let row = 0; row < rows; row++) {
      const midY = row * rowH + rowH * 0.5;
      const phase = t * 0.35 + row * 0.5;
      drawWaveBand(ctx, w, midY, (row + 1) * rowH, amp, phase, 0.018, 0);
      ctx.fillStyle = lerpColor(palette[0], palette[3], row / rows);
      ctx.globalAlpha = 0.55 + (p.wallThickness / 6) * 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
});

const corrugatedThermalSkin: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const sharp = clamp(p.foldSharpness / 100, 0, 1);
    const freq = (2 * Math.PI * p.foldDensity) / w;
    const amp = h * 0.26;
    const midY = h * 0.5;

    drawWaveBand(ctx, w, midY, h, amp, t * 0.2, freq, sharp);
    ctx.fillStyle = lerpColor(palette[2], palette[3], 0.5);
    ctx.fill();

    drawWaveBand(ctx, w, midY, h, amp, t * 0.2 + 0.4, freq, sharp);
    ctx.fillStyle = `rgba(0,0,0,${0.15 + clamp(p.shadowDepth / 100, 0, 1) * 0.45})`;
    ctx.fill();
  },
});

const ribbedMassBuffer: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const ribCount = Math.max(4, Math.round(p.ribDensity));
    const ribW = w / ribCount;
    const gapFrac = clamp(p.airGapDepth / 100, 0.1, 0.8);
    const delaySpeed = 0.15 + (p.thermalDelay / 100) * 0.5;

    for (let i = 0; i < ribCount; i++) {
      const x0 = i * ribW;
      const solidW = ribW * (1 - gapFrac);
      const heatPhase = Math.sin(t * delaySpeed - i * 0.4) * 0.5 + 0.5;

      ctx.fillStyle = lerpColor(palette[1], palette[3], heatPhase);
      ctx.fillRect(x0, 0, solidW, h);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x0 + solidW, 0, ribW - solidW, h);
    }
  },
});

const rollingTopography: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const relief = clamp(p.terrainRelief / 100, 0, 1);
    const windSpeed = 0.08 + (p.windExposure / 100) * 0.5;
    const baseY = h * 0.55;
    const amp = h * 0.3 * relief;
    const freq = 0.004 * p.terrainScale;

    drawWaveBand(ctx, w, baseY, h, amp, t * windSpeed, freq, 0, 0.35);
    ctx.fillStyle = lerpColor(palette[1], palette[2], 0.5);
    ctx.fill();

    const sky = ctx.createLinearGradient(0, 0, 0, baseY);
    sky.addColorStop(0, palette[0]);
    sky.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, baseY);
  },
});

// ---------------------------------------------------------------------------
// RadialPhyllotaxis engine — shared radial-placement primitive for the
// kinetic-folding-petals subcategory's 4 mechanism types. forEachRadialPetal
// evenly spaces N elements around a center; drawPetalOutline is a thin
// reusable "petal blade" path (a curved teardrop) used wherever a type calls
// for a curved petal rather than a hard-edged fold panel.
// ---------------------------------------------------------------------------
function forEachRadialPetal(
  cx: number,
  cy: number,
  count: number,
  angleOffset: number,
  cb: (i: number, angle: number) => void
) {
  const angleStep = (2 * Math.PI) / count;
  for (let i = 0; i < count; i++) {
    cb(i, i * angleStep + angleOffset);
  }
}

function drawPetalOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.4, width, length, 0);
  ctx.quadraticCurveTo(length * 0.4, -width, 0, 0);
  ctx.closePath();
  ctx.restore();
}

const radialBloom: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.petalCount);
    const openT = clamp(p.openAngle / 100, 0, 1);
    const lightRad = (p.lightAngle / 180) * Math.PI;
    const R = Math.min(w, h) * 0.42;

    forEachRadialPetal(cx, cy, count, t * 0.12, (i, angle) => {
      const bias = Math.cos(angle - lightRad) * 0.5 + 0.5;
      const petalOpen = openT * (0.45 + bias * 0.55);
      const len = R * (0.3 + petalOpen * 0.7);
      const width = len * 0.3;

      drawPetalOutline(ctx, cx, cy, angle, len, width);
      ctx.fillStyle = lerpColor(palette[1], palette[3], i / count);
      ctx.fill();
    });
  },
});

const origamiFold: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.panelCount);
    const foldT = clamp(p.foldAngle / 90, 0, 1);
    const sharp = clamp(p.creaseSharpness / 100, 0, 1);
    const R = Math.min(w, h) * 0.42;

    forEachRadialPetal(cx, cy, count, t * 0.08, (i, angle) => {
      const spread = (1 - foldT) * (Math.PI / count) * 0.9;
      const a0 = angle - spread;
      const a1 = angle + spread;
      const r = R * (0.5 + foldT * 0.5);
      const midR = r * (1 - foldT * 0.3);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.lineTo(cx + Math.cos(angle) * midR, cy + Math.sin(angle) * midR);
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.closePath();

      const shade = i % 2 === 0 ? 0.3 : 0.7;
      ctx.fillStyle = lerpColor(palette[1], palette[3], shade * (0.6 + sharp * 0.4));
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1 + sharp * 1.5;
      ctx.stroke();
    });
  },
});

const layeredPetalCascade: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const layers = Math.max(2, Math.round(p.layerCount));
    const petalsPerLayer = 8;
    const R = Math.min(w, h) * 0.42;
    const delayT = p.cascadeDelay / 100;
    const unfold = clamp(p.unfoldProgress / 100, 0, 1);

    for (let l = 0; l < layers; l++) {
      const layerT = l / Math.max(1, layers - 1);
      const layerUnfold = clamp(unfold - layerT * delayT * 0.8, 0, 1);
      const radius = R * (0.35 + layerT * 0.65) * (0.35 + layerUnfold * 0.65);
      const rotOffset = layerT * Math.PI * 0.4 + t * 0.08;

      forEachRadialPetal(cx, cy, petalsPerLayer, rotOffset, (i, angle) => {
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const len = radius * 0.34;
        const width = len * 0.4;

        drawPetalOutline(ctx, px, py, angle, len, width);
        ctx.fillStyle = lerpColor(palette[1], palette[3], layerT);
        ctx.globalAlpha = 0.45 + layerUnfold * 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  },
});

const pneumaticPetal: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.petalCount);
    const pressureT = clamp(p.pressure / 100, 0, 1);
    const speed = 0.3 + (p.responseSpeed / 100) * 2.2;
    const R = Math.min(w, h) * 0.4;

    forEachRadialPetal(cx, cy, count, 0, (i, angle) => {
      const pulse = Math.sin(t * speed + i * 0.7) * 0.5 + 0.5;
      const inflate = clamp(pressureT * (0.5 + pulse * 0.5), 0, 1);
      const len = R * (0.3 + inflate * 0.7);
      const tipX = cx + Math.cos(angle) * len;
      const tipY = cy + Math.sin(angle) * len;
      const rad = len * 0.36;

      const grad = ctx.createRadialGradient(tipX, tipY, rad * 0.1, tipX, tipY, rad);
      grad.addColorStop(0, lerpColor(palette[3], "#ffffff", 0.2 + inflate * 0.25));
      grad.addColorStop(1, lerpColor(palette[1], palette[2], 1 - inflate));

      ctx.beginPath();
      ctx.ellipse(tipX, tipY, rad, rad * 0.85, angle, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  },
});

const curlingStripArray: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const rows = Math.max(4, Math.round(p.stripCount));
    const rowH = h / rows;
    const tempNorm = clamp(p.temperature / 80, 0, 1);
    const amp = rowH * 0.8 * (p.curlAmplitude / 100) * (0.3 + tempNorm * 1.2);

    for (let row = 0; row < rows; row++) {
      const midY = row * rowH + rowH * 0.5;
      const phase = t * 0.5 + row * 0.6;
      drawWaveBand(ctx, w, midY, (row + 1) * rowH, amp, phase, 0.03, 0.3);
      ctx.fillStyle = lerpColor(palette[1], palette[3], tempNorm);
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
});

const bistableSnap: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const trigger = clamp(p.triggerLevel / 100, 0, 1);
    const sharpness = 1 + (p.snapSharpness / 100) * 30;
    const snapT = 1 / (1 + Math.exp(-sharpness * (trigger - 0.5)));
    const rows = Math.max(1, Math.round(p.waveDensity));
    const rowH = h / rows;
    const amp = rowH * 0.85 * snapT;

    for (let row = 0; row < rows; row++) {
      const midY = row * rowH + rowH * 0.5;
      const phase = t * 0.4 + row * 0.9;
      drawWaveBand(ctx, w, midY, (row + 1) * rowH, amp, phase, 0.022, 0);
      ctx.fillStyle = lerpColor(palette[0], palette[3], snapT);
      ctx.fill();
    }
  },
});

const irisAperture: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.max(4, Math.round(p.bladeCount));
    const closeT = clamp(p.closureLevel / 100, 0, 1);
    const speed = 0.2 + (p.responseSpeed / 100) * 0.8;
    const R = Math.min(w, h) * 0.44;
    const flutter = Math.sin(t * speed) * 0.02;
    const rotate = (closeT + flutter) * Math.PI * 0.9;

    forEachRadialPetal(cx, cy, count, 0, (i, angle) => {
      const a0 = angle;
      const a1 = angle + (2 * Math.PI) / count + rotate;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.closePath();
      ctx.fillStyle = lerpColor(palette[1], palette[3], i / count);
      ctx.fill();
    });

    const apertureR = R * 0.5 * (1 - closeT);
    if (apertureR > 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, apertureR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fill();
    }
  },
});

const gradientThicknessMembrane: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.max(6, Math.round(p.petalCount));
    const gradientT = clamp(p.thicknessGradient / 100, 0, 1);
    const lag = p.responseLag / 100;
    const R = Math.min(w, h) * 0.42;

    forEachRadialPetal(cx, cy, count, 0, (i, angle) => {
      const dirBias = Math.cos(angle) * 0.5 + 0.5;
      const thickness = 0.3 + dirBias * gradientT;
      const wave = Math.sin(t * (0.6 - thickness * 0.4) - dirBias * lag * 3) * 0.5 + 0.5;
      const len = R * (0.35 + wave * (0.65 - thickness * 0.3));
      const width = len * 0.28;

      drawPetalOutline(ctx, cx, cy, angle, len, width);
      ctx.fillStyle = lerpColor(palette[1], palette[3], thickness);
      ctx.fill();
    });
  },
});

// ---------------------------------------------------------------------------
// Voronoi engine — shared true-tessellation primitive for the voronoi
// subcategory's 4 mechanism types. makeVoronoiSeeds builds a jittered seed
// point set; forEachVoronoiCellPixel rasterizes the diagram on a step grid,
// handing each type its nearest-seed index and edge-proximity value so it
// can decide how to render cell fill vs. boundary.
// ---------------------------------------------------------------------------
function makeVoronoiSeeds(
  n: number,
  w: number,
  h: number,
  t: number,
  jitterAmt: number
): { x: number; y: number }[] {
  const rand = mulberry32(Math.floor(n * 977 + jitterAmt * 3100));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const sx = rand();
    const sy = rand();
    pts.push({
      x: (sx + Math.sin(t * 0.15 + i) * 0.02 * jitterAmt) * w,
      y: (sy + Math.cos(t * 0.15 + i * 1.3) * 0.02 * jitterAmt) * h,
    });
  }
  return pts;
}

function forEachVoronoiCellPixel(
  w: number,
  h: number,
  points: { x: number; y: number }[],
  step: number,
  cb: (gx: number, gy: number, step: number, best: number, edge: number) => void
) {
  for (let gy = 0; gy < h; gy += step) {
    for (let gx = 0; gx < w; gx += step) {
      let best = 0;
      let bestD = Infinity;
      let secondD = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dx = points[i].x - gx;
        const dy = points[i].y - gy;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          secondD = bestD;
          bestD = d;
          best = i;
        } else if (d < secondD) {
          secondD = d;
        }
      }
      const edge = Math.sqrt(secondD) - Math.sqrt(bestD);
      cb(gx, gy, step, best, edge);
    }
  }
}

const cellularSkinVoronoi: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.round(p.cellCount);
    const jitterAmt = p.jitter / 100;
    const pts = makeVoronoiSeeds(n, w, h, t, jitterAmt);
    const poreAlpha = clamp(p.poreOpacity / 100, 0, 1);

    forEachVoronoiCellPixel(w, h, pts, 6, (gx, gy, step, best, edge) => {
      const isEdge = edge < 3;
      ctx.fillStyle = isEdge ? `rgba(0,0,0,${poreAlpha})` : lerpColor(palette[1], palette[3], (best % 7) / 7);
      ctx.fillRect(gx, gy, step, step);
    });
  },
});

const structuralVoronoiShell: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.round(p.cellCount);
    const jitterAmt = p.jitter / 100;
    const pts = makeVoronoiSeeds(n, w, h, t, jitterAmt);
    const memberW = p.memberWidth;

    forEachVoronoiCellPixel(w, h, pts, 5, (gx, gy, step, best, edge) => {
      const isMember = edge < memberW;
      ctx.fillStyle = isMember ? lerpColor(palette[2], palette[3], 0.6) : lerpColor(palette[0], palette[1], 0.3);
      ctx.globalAlpha = isMember ? 1 : 0.35;
      ctx.fillRect(gx, gy, step, step);
      ctx.globalAlpha = 1;
    });
  },
});

const densityGradedVoronoi: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const gradRad = (p.gradientAngle / 180) * Math.PI;
    const dirX = Math.cos(gradRad);
    const dirY = Math.sin(gradRad);
    const contrast = clamp(p.contrastRange / 100, 0, 1);
    const candidates = Math.round(p.baseCellCount) * 4;
    const rand = mulberry32(Math.floor(candidates * 977));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < candidates; i++) {
      const x = rand();
      const y = rand();
      const proj = (x - 0.5) * dirX + (y - 0.5) * dirY;
      const density = clamp(0.2 + (0.5 + proj) * contrast, 0, 1);
      if (rand() < density) {
        pts.push({
          x: (x + Math.sin(t * 0.15 + i) * 0.015) * w,
          y: (y + Math.cos(t * 0.15 + i * 1.3) * 0.015) * h,
        });
      }
    }
    if (pts.length < 3) {
      pts.push({ x: w / 2, y: h / 2 }, { x: w * 0.3, y: h * 0.7 }, { x: w * 0.7, y: h * 0.3 });
    }

    forEachVoronoiCellPixel(w, h, pts, 6, (gx, gy, step, best, edge) => {
      const isEdge = edge < 3;
      ctx.fillStyle = isEdge ? "rgba(0,0,0,0.5)" : lerpColor(palette[1], palette[3], (best % 7) / 7);
      ctx.fillRect(gx, gy, step, step);
    });
  },
});

const boneVoronoi: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.round(p.cellCount);
    const pts = makeVoronoiSeeds(n, w, h, t, 0.3);
    const porosityT = clamp(p.porosity / 100, 0, 1);
    const strutW = p.strutThickness * (1 - porosityT * 0.5);

    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, w, h);

    forEachVoronoiCellPixel(w, h, pts, 5, (gx, gy, step, best, edge) => {
      const strutT = clamp(1 - edge / (strutW * 4), 0, 1);
      if (strutT > 0.02) {
        ctx.fillStyle = lerpColor(palette[2], palette[3], strutT);
        ctx.globalAlpha = strutT;
        ctx.fillRect(gx, gy, step, step);
        ctx.globalAlpha = 1;
      }
    });
  },
});

// ---------------------------------------------------------------------------
// forEachPhyllotaxisPoint — golden-angle spiral point placement, the second
// half of the RadialPhyllotaxis family alongside forEachRadialPetal. Where
// forEachRadialPetal evenly spaces N elements at one radius (petals/blades),
// this spaces them by the golden angle with radius growing as sqrt(i), the
// true phyllotaxis (sunflower-seed) point field. Used by 2 of fibonacci's 4
// types; the other 2 (a continuous logarithmic spiral curve, and a vertical
// stacked-floor tower) are standalone factories — neither placement helper
// fits a continuous curve or a floor stack, so they aren't forced onto one.
// ---------------------------------------------------------------------------
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function forEachPhyllotaxisPoint(
  cx: number,
  cy: number,
  count: number,
  scale: number,
  cb: (i: number, x: number, y: number, r: number, angle: number) => void
) {
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN_ANGLE;
    const r = scale * Math.sqrt(i);
    cb(i, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, r, angle);
  }
}

const logarithmicShellSpiral: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const b = Math.log(p.growthRate) / (Math.PI / 2);
    const maxAngle = p.turns * 2 * Math.PI;
    const startR = Math.min(w, h) * 0.02;
    const rot = t * 0.06;

    ctx.beginPath();
    for (let a = 0; a <= maxAngle; a += 0.05) {
      const r = startR * Math.exp(b * a);
      const x = cx + Math.cos(a + rot) * r;
      const y = cy + Math.sin(a + rot) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lerpColor(palette[2], palette[3], 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();

    const chamberCount = Math.round(p.chamberCount);
    const chamberStep = maxAngle / chamberCount;
    for (let c = 0; c <= chamberCount; c++) {
      const a = c * chamberStep;
      const r = startR * Math.exp(b * a);
      const x = cx + Math.cos(a + rot) * r;
      const y = cy + Math.sin(a + rot) * r;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = lerpColor(palette[1], palette[3], c / chamberCount);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
});

const phyllotaxisFacade: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.apertureCount);
    const scale = Math.min(w, h) * 0.045 * p.spiralDensity;

    forEachPhyllotaxisPoint(cx, cy, count, scale, (i, x, y) => {
      if (x < 0 || x > w || y < 0 || y > h) return;
      const shimmer = 1 + 0.05 * Math.sin(t * 0.5 + i * 0.3);
      const rad = p.apertureScale * (0.5 + (i / count) * 0.6) * shimmer;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[1], palette[3], (i % 13) / 13);
      ctx.fill();
    });
  },
});

const spiralGrowthTower: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const floors = Math.round(p.floorCount);
    const floorH = h / floors;
    const taper = p.taperRatio / 100;
    const twist = (p.twistPerFloor / 180) * Math.PI;

    for (let f = 0; f < floors; f++) {
      const fT = f / floors;
      const floorW = w * 0.7 * (1 - taper * fT);
      const offset = Math.sin(f * twist + t * 0.1) * w * 0.12;
      const x0 = (w - floorW) / 2 + offset;
      const y0 = h - (f + 1) * floorH;

      ctx.fillStyle = lerpColor(palette[1], palette[3], fT);
      ctx.fillRect(x0, y0, floorW, floorH * 0.88);
    }
  },
});

const radialFibonacciLouver: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.louverCount);
    const scale = Math.min(w, h) * 0.05 * p.spacingScale;
    const louverLen = p.louverLength;

    forEachPhyllotaxisPoint(cx, cy, count, scale, (i, x, y, r, angle) => {
      if (x < -louverLen || x > w + louverLen || y < -louverLen || y > h + louverLen) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = lerpColor(palette[1], palette[3], (i % 17) / 17);
      ctx.fillRect(-1.5, -louverLen / 2, 3, louverLen);
      ctx.restore();
    });
  },
});

// ---------------------------------------------------------------------------
// FractalBranching engine — shared recursive-branch walker for fractal-tree's
// 4 mechanism types. Each factory supplies its own start point/direction,
// angle spread, length ratio and branch count (2 for a binary tree, 3-4 for
// denser canopy/root spreads); the callback receives each drawn segment so
// the factory decides its own stroke style, color, and any extra decoration.
// ---------------------------------------------------------------------------
function walkFractalBranch(
  x: number,
  y: number,
  len: number,
  angle: number,
  depth: number,
  maxDepth: number,
  t: number,
  angleSpread: number,
  lengthRatio: number,
  branchCount: number,
  cb: (x1: number, y1: number, x2: number, y2: number, depth: number, maxDepth: number) => void
) {
  if (depth <= 0 || len < 2) return;
  const sway = Math.sin(t * 0.6 + depth * 1.3) * 0.06 * (maxDepth - depth + 1);
  const a = angle + sway;
  const x2 = x + Math.cos(a) * len;
  const y2 = y + Math.sin(a) * len;
  cb(x, y, x2, y2, depth, maxDepth);

  if (branchCount <= 2) {
    walkFractalBranch(x2, y2, len * lengthRatio, a - angleSpread, depth - 1, maxDepth, t, angleSpread, lengthRatio, branchCount, cb);
    walkFractalBranch(x2, y2, len * lengthRatio, a + angleSpread, depth - 1, maxDepth, t, angleSpread, lengthRatio, branchCount, cb);
  } else {
    for (let i = 0; i < branchCount; i++) {
      const frac = branchCount === 1 ? 0 : (i / (branchCount - 1)) * 2 - 1;
      walkFractalBranch(x2, y2, len * lengthRatio, a + frac * angleSpread, depth - 1, maxDepth, t, angleSpread, lengthRatio, branchCount, cb);
    }
  }
}

const branchingStructuralColumn: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.depth);
    const angleRad = (p.branchAngle / 180) * Math.PI;

    walkFractalBranch(w / 2, h * 0.97, h * 0.24, -Math.PI / 2, maxDepth, maxDepth, t, angleRad, p.lengthRatio, 2, (x1, y1, x2, y2, depth, maxD) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[1], palette[3], 1 - depth / maxD);
      ctx.lineWidth = Math.max(1.2, depth * 1.1);
      ctx.lineCap = "round";
      ctx.stroke();
    });
  },
});

const recursiveCanopy: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.depth);
    const angleRad = (p.spreadAngle / 180) * Math.PI;
    const branchCount = Math.round(p.branchCount);

    walkFractalBranch(w / 2, h * 0.08, h * 0.16, Math.PI / 2, maxDepth, maxDepth, t, angleRad, 0.68, branchCount, (x1, y1, x2, y2, depth, maxD) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[1], palette[3], 1 - depth / maxD);
      ctx.lineWidth = Math.max(1, depth * 0.9);
      ctx.lineCap = "round";
      ctx.stroke();

      if (depth === 1) {
        ctx.beginPath();
        ctx.arc(x2, y2, 5, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(palette[2], palette[3], 0.6);
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  },
});

const fractalVentilation: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.depth);
    const angleRad = (p.branchAngle / 180) * Math.PI;
    const speed = 0.3 + (p.flowSpeed / 100) * 2;

    walkFractalBranch(w * 0.5, h * 0.95, h * 0.2, -Math.PI / 2, maxDepth, maxDepth, t, angleRad, 0.74, 2, (x1, y1, x2, y2, depth, maxD) => {
      const flow = Math.sin(t * speed - depth * 0.8) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[0], palette[3], flow);
      ctx.lineWidth = Math.max(1.5, depth * 1.3);
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  },
});

const rootSystemFoundation: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.depth);
    const angleRad = (p.spreadAngle / 180) * Math.PI;
    const branchCount = Math.round(p.branchCount);

    ctx.beginPath();
    ctx.moveTo(0, h * 0.08);
    ctx.lineTo(w, h * 0.08);
    ctx.strokeStyle = lerpColor(palette[2], palette[3], 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();

    walkFractalBranch(w / 2, h * 0.08, h * 0.18, Math.PI / 2, maxDepth, maxDepth, t, angleRad, 0.7, branchCount, (x1, y1, x2, y2, depth, maxD) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[1], palette[2], 1 - depth / maxD);
      ctx.lineWidth = Math.max(0.8, depth * 0.85);
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.5 + 0.5 * (depth / maxD);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  },
});

// ---------------------------------------------------------------------------
// ReactionDiffusion engine — shared Gray-Scott stepper for 3 of
// reaction-diffusion's 4 mechanism types. Each factory owns its own sim
// instance (state can't be shared across factory instances) but all reuse
// the same step/render algorithm; only feedRate/killRate presets and the
// palette-index mapping differ, which is what actually produces the
// visually distinct stripe / mitosis / coral regimes in real Gray-Scott
// parameter space. The 4th type (Diffusion-Limited Aggregation) is a
// standalone stochastic branch-walker — a fundamentally different
// (probabilistic particle-aggregation-style) algorithm from both this
// engine and from FractalBranching's deterministic symmetric recursion,
// so it isn't forced onto either.
// ---------------------------------------------------------------------------
function createReactionDiffusionSim(gw: number, gh: number) {
  const N = gw * gh;
  let U = new Float32Array(N).fill(1);
  let V = new Float32Array(N).fill(0);
  let Un = new Float32Array(N);
  let Vn = new Float32Array(N);
  let seeded = false;
  let off: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let imgData: ImageData | null = null;

  const idx = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= gw ? gw - 1 : x;
    const cy = y < 0 ? 0 : y >= gh ? gh - 1 : y;
    return cy * gw + cx;
  };

  function seedBlobs(count: number, radius: number) {
    const rand = mulberry32(42);
    for (let s = 0; s < count; s++) {
      const sx = Math.floor(rand() * gw);
      const sy = Math.floor(rand() * gh);
      for (let y = sy - radius; y <= sy + radius; y++) {
        for (let x = sx - radius; x <= sx + radius; x++) {
          V[idx(x, y)] = 1;
        }
      }
    }
    seeded = true;
  }

  // Diffusion coefficients 0.16/0.08 (not 1.0/0.5, which this was originally
  // copied from) — the larger pair violates the explicit-scheme stability
  // bound for a 4-neighbor Laplacian at this step size and saturates every
  // cell to 0/1 regardless of f/k, which made all 3 presets below converge
  // to the identical pattern. Verified empirically before/after the fix.
  function step(f: number, k: number, iterations: number) {
    if (!seeded) seedBlobs(6, 3);
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          const u = U[i];
          const v = V[i];
          const lapU = U[idx(x - 1, y)] + U[idx(x + 1, y)] + U[idx(x, y - 1)] + U[idx(x, y + 1)] - 4 * u;
          const lapV = V[idx(x - 1, y)] + V[idx(x + 1, y)] + V[idx(x, y - 1)] + V[idx(x, y + 1)] - 4 * v;
          const uvv = u * v * v;
          Un[i] = clamp(u + (0.16 * lapU - uvv + f * (1 - u)), 0, 1);
          Vn[i] = clamp(v + (0.08 * lapV + uvv - (f + k) * v), 0, 1);
        }
      }
      [U, Un] = [Un, U];
      [V, Vn] = [Vn, V];
    }
  }

  function render(ctx: CanvasRenderingContext2D, w: number, h: number, colorA: string, colorB: string) {
    if (!off) {
      off = document.createElement("canvas");
      off.width = gw;
      off.height = gh;
      offCtx = off.getContext("2d");
      imgData = offCtx?.createImageData(gw, gh) ?? null;
    }
    if (imgData && offCtx) {
      const data = imgData.data;
      for (let i = 0; i < N; i++) {
        const val = clamp(U[i] - V[i], 0, 1);
        const color = lerpColor(colorA, colorB, 1 - val);
        const m = color.match(/[\d.]+/g);
        data[i * 4] = m ? +m[0] : 0;
        data[i * 4 + 1] = m ? +m[1] : 0;
        data[i * 4 + 2] = m ? +m[2] : 0;
        data[i * 4 + 3] = 255;
      }
      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, gw, gh, 0, 0, w, h);
    }
  }

  return { step, render };
}

const turingPatternSkin: Factory = () => {
  const sim = createReactionDiffusionSim(120, 90);
  return {
    draw(ctx, w, h, t, p, palette) {
      sim.step(p.feedRate, p.killRate, Math.max(1, Math.round(p.diffusionSpeed)));
      sim.render(ctx, w, h, palette[0], palette[3]);
    },
  };
};

const cellularGrowthSimulation: Factory = () => {
  const sim = createReactionDiffusionSim(120, 90);
  return {
    draw(ctx, w, h, t, p, palette) {
      sim.step(p.feedRate, p.killRate, Math.max(1, Math.round(p.diffusionSpeed)));
      sim.render(ctx, w, h, palette[1], palette[2]);
    },
  };
};

const coralGrowthPattern: Factory = () => {
  const sim = createReactionDiffusionSim(120, 90);
  return {
    draw(ctx, w, h, t, p, palette) {
      sim.step(p.feedRate, p.killRate, Math.max(1, Math.round(p.diffusionSpeed)));
      sim.render(ctx, w, h, palette[0], palette[2]);
    },
  };
};

const diffusionLimitedAggregation: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const maxDepth = Math.round(p.growthDepth);
    const branchProb = clamp(p.branchProbability / 100, 0, 1);
    const jitter = p.jitterAmount / 100;
    const rand = mulberry32(Math.floor(maxDepth * 131 + branchProb * 977 + jitter * 313));

    function grow(x: number, y: number, len: number, angle: number, depth: number) {
      if (depth <= 0 || len < 1.5) return;
      const sway = (rand() - 0.5) * jitter * 1.2 + Math.sin(t * 0.3 + depth) * 0.03;
      const a = angle + sway;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = lerpColor(palette[1], palette[3], 1 - depth / maxDepth);
      ctx.lineWidth = Math.max(0.6, depth * 0.5);
      ctx.lineCap = "round";
      ctx.stroke();

      grow(x2, y2, len * 0.82, a + (rand() - 0.5) * 0.9, depth - 1);
      if (rand() < branchProb) {
        grow(x2, y2, len * 0.7, a + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.6), depth - 1);
      }
      if (rand() < branchProb * 0.5) {
        grow(x2, y2, len * 0.6, a + (rand() < 0.5 ? -1 : 1) * (0.8 + rand() * 0.6), depth - 1);
      }
    }

    grow(w / 2, h / 2, Math.min(w, h) * 0.05, rand() * Math.PI * 2, maxDepth);
  },
});

// ---------------------------------------------------------------------------
// SpaceColonization engine — shared vein-growth stepper for vein-flow's 4
// mechanism types. Each factory owns its own attractors/nodes state (grown
// incrementally across draw calls, same as the pre-existing veinFlow
// baseline this was extracted from) but all reuse the same growth step:
// every attractor pulls its single nearest node, nodes advance toward the
// averaged pull direction, and attractors within kill range are consumed.
// Factories differ only in where attractors are seeded and where growth
// starts from, which is what actually produces the leaf/stream/drain/
// load-path distinction.
// ---------------------------------------------------------------------------
type VeinNode = { x: number; y: number; parent: number };
type VeinPoint = { x: number; y: number };

function seedInEllipse(
  rand: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): VeinPoint {
  for (let tries = 0; tries < 20; tries++) {
    const x = (rand() * 2 - 1) * rx;
    const y = (rand() * 2 - 1) * ry;
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) return { x: cx + x, y: cy + y };
  }
  return { x: cx, y: cy };
}

function stepSpaceColonization(
  nodes: VeinNode[],
  attractors: VeinPoint[],
  influenceR: number,
  killR: number,
  stepLen: number,
  iterations: number
): { nodes: VeinNode[]; attractors: VeinPoint[] } {
  for (let iter = 0; iter < iterations && nodes.length < 900; iter++) {
    const pulls = new Map<number, { dx: number; dy: number; n: number }>();

    for (const a of attractors) {
      let bestI = -1;
      let bestD = influenceR;
      for (let i = 0; i < nodes.length; i++) {
        const dx = a.x - nodes[i].x;
        const dy = a.y - nodes[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      if (bestI >= 0) {
        const dx = a.x - nodes[bestI].x;
        const dy = a.y - nodes[bestI].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const cur = pulls.get(bestI) ?? { dx: 0, dy: 0, n: 0 };
        cur.dx += dx / d;
        cur.dy += dy / d;
        cur.n += 1;
        pulls.set(bestI, cur);
      }
    }

    const newNodes: VeinNode[] = [];
    pulls.forEach((v, i) => {
      const dx = v.dx / v.n;
      const dy = v.dy / v.n;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      newNodes.push({ x: nodes[i].x + (dx / d) * stepLen, y: nodes[i].y + (dy / d) * stepLen, parent: i });
    });
    for (const n of newNodes) nodes.push(n);

    attractors = attractors.filter((a) => {
      for (const n of nodes) {
        const dx = a.x - n.x;
        const dy = a.y - n.y;
        if (dx * dx + dy * dy < killR * killR) return false;
      }
      return true;
    });
  }
  return { nodes, attractors };
}

function drawVeinNetwork(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  nodes: VeinNode[],
  palette: Palette,
  baseWidth: number
) {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.parent < 0) continue;
    const parent = nodes[n.parent];
    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = lerpColor(palette[1], palette[3], i / Math.max(1, nodes.length));
    ctx.lineWidth = Math.max(0.6, baseWidth * (1 - i / Math.max(1, nodes.length)));
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

const leafVenationStructural: Factory = () => {
  let attractors: VeinPoint[] = [];
  let nodes: VeinNode[] = [];
  let lastDensity = -1;

  return {
    draw(ctx, w, h, t, p, palette) {
      const density = Math.round(p.veinDensity);
      if (Math.abs(density - lastDensity) > 0.5 || nodes.length === 0) {
        const rand = mulberry32(Math.floor(density * 97 + 7));
        attractors = [];
        const cx = w * 0.5;
        const cy = h * 0.46;
        const rx = w * 0.42;
        const ry = h * 0.42;
        for (let i = 0; i < density; i++) attractors.push(seedInEllipse(rand, cx, cy, rx, ry));
        nodes = [{ x: w * 0.5, y: h * 0.96, parent: -1 }];
        lastDensity = density;
      }

      const influenceR = Math.max(w, h) * 0.18;
      const killR = Math.max(w, h) * 0.035;
      const stepLen = 4 + p.growthSpeed * 0.4;
      const iterations = Math.max(1, Math.round(p.growthSpeed / 2));
      const result = stepSpaceColonization(nodes, attractors, influenceR, killR, stepLen, iterations);
      nodes = result.nodes;
      attractors = result.attractors;

      drawVeinNetwork(ctx, w, h, nodes, palette, p.branchWidth);
    },
  };
};

const fluidDynamicFacade: Factory = () => {
  let attractors: VeinPoint[] = [];
  let nodes: VeinNode[] = [];
  let lastDensity = -1;

  return {
    draw(ctx, w, h, t, p, palette) {
      const density = Math.round(p.streamDensity);
      if (Math.abs(density - lastDensity) > 0.5 || nodes.length === 0) {
        const rand = mulberry32(Math.floor(density * 131 + 11));
        attractors = [];
        for (let i = 0; i < density; i++) attractors.push({ x: rand() * w, y: rand() * h });
        nodes = [0.15, 0.38, 0.62, 0.85].map((f) => ({ x: w * 0.02, y: h * f, parent: -1 }));
        lastDensity = density;
      }

      const influenceR = Math.max(w, h) * 0.2;
      const killR = Math.max(w, h) * 0.035;
      const stepLen = 4 + p.flowSpeed * 0.4;
      const iterations = Math.max(1, Math.round(p.flowSpeed / 2));
      const result = stepSpaceColonization(nodes, attractors, influenceR, killR, stepLen, iterations);
      nodes = result.nodes;
      attractors = result.attractors;

      drawVeinNetwork(ctx, w, h, nodes, palette, p.lineWidth);
    },
  };
};

const capillaryDrainage: Factory = () => {
  let attractors: VeinPoint[] = [];
  let nodes: VeinNode[] = [];
  let lastDensity = -1;

  return {
    draw(ctx, w, h, t, p, palette) {
      const density = Math.round(p.drainDensity);
      if (Math.abs(density - lastDensity) > 0.5 || nodes.length === 0) {
        const rand = mulberry32(Math.floor(density * 71 + 13));
        attractors = [];
        for (let i = 0; i < density; i++) attractors.push({ x: rand() * w, y: rand() * h * 0.94 });
        nodes = [0.25, 0.5, 0.75].map((f) => ({ x: w * f, y: h * 0.98, parent: -1 }));
        lastDensity = density;
      }

      const influenceR = Math.max(w, h) * 0.19;
      const killR = Math.max(w, h) * 0.035;
      const stepLen = 4 + p.flowSpeed * 0.4;
      const iterations = Math.max(1, Math.round(p.flowSpeed / 2));
      const result = stepSpaceColonization(nodes, attractors, influenceR, killR, stepLen, iterations);
      nodes = result.nodes;
      attractors = result.attractors;

      drawVeinNetwork(ctx, w, h, nodes, palette, p.lineWidth);
    },
  };
};

const branchingLoadPath: Factory = () => {
  let attractors: VeinPoint[] = [];
  let nodes: VeinNode[] = [];
  let lastKey = -1;

  return {
    draw(ctx, w, h, t, p, palette) {
      const clusterCount = Math.round(p.loadPointCount);
      if (clusterCount !== lastKey || nodes.length === 0) {
        const rand = mulberry32(Math.floor(clusterCount * 613 + 29));
        const clusters: VeinPoint[] = [];
        for (let c = 0; c < clusterCount; c++) {
          clusters.push({ x: rand() * w * 0.7 + w * 0.15, y: rand() * h * 0.55 + h * 0.05 });
        }
        attractors = [];
        for (let i = 0; i < 48; i++) {
          const cl = clusters[i % clusterCount];
          attractors.push({ x: cl.x + (rand() - 0.5) * w * 0.1, y: cl.y + (rand() - 0.5) * h * 0.1 });
        }
        // One start node per cluster, aligned under its own cluster's x
        // position — not one shared trunk node. A single shared start
        // reaching for every cluster at once had each cluster's pull
        // vector fight the others (opposite horizontal directions largely
        // cancel out when averaged), so it crept in a compromise direction
        // and stalled instead of branching. Aligning one node per cluster
        // means each one's pulls come predominantly from its own nearby
        // cluster, so growth actually reaches all of them. Verified
        // visually before/after this fix.
        nodes = clusters.map((cl) => ({ x: cl.x, y: h * 0.96, parent: -1 }));
        lastKey = clusterCount;
      }

      // Load-point clusters are sparse isolated blobs (not a continuous
      // field like the other 3 types), so influenceR must be large enough
      // to bridge the full worst-case distance from the base to any
      // cluster in one hop — a small radius (as used elsewhere) left the
      // base node(s) permanently out of range of every attractor, so
      // nothing ever grew. Verified visually before/after this fix.
      const influenceR = Math.max(w, h) * 1.3;
      const killR = Math.max(w, h) * 0.035;
      const stepLen = 4 + p.growthSpeed * 0.4;
      const iterations = Math.max(1, Math.round(p.growthSpeed / 2));
      const result = stepSpaceColonization(nodes, attractors, influenceR, killR, stepLen, iterations);
      nodes = result.nodes;
      attractors = result.attractors;

      drawVeinNetwork(ctx, w, h, nodes, palette, p.lineWidth);
    },
  };
};

// ---------------------------------------------------------------------------
// structural-geometry's 4 types (Geodesic Dome, Tensegrity, Honeycomb Panel,
// Minimal Surface Shell) are each a genuinely distinct structural-geometry
// system — a triangulated ring-projected dome, floating strut+cable network,
// hex tessellation, and a warped quad mesh — with no shared iteration
// pattern that isn't a forced fit, so all 4 are standalone factories rather
// than built on one artificial "engine", consistent with how earlier groups
// (ribbedMassBuffer, origamiFold, logarithmicShellSpiral, etc.) diverged
// from their siblings when the geometry genuinely didn't fit.
// ---------------------------------------------------------------------------
const geodesicDome: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const rings = Math.round(p.frequency);
    const segments = Math.round(p.segments);
    const cx = w / 2;
    const cy = h * 0.62;
    const R = Math.min(w, h) * 0.44;

    const pts: { x: number; y: number }[][] = [];
    for (let r = 0; r <= rings; r++) {
      const latT = r / rings;
      const domeY = -Math.cos((latT * Math.PI) / 2) * R;
      const domeR = Math.sin((latT * Math.PI) / 2) * R;
      const row: { x: number; y: number }[] = [];
      const segCount = r === 0 ? 1 : segments;
      for (let s = 0; s < segCount; s++) {
        const ang = (s / segCount) * Math.PI * 2 + t * 0.05;
        row.push({
          x: cx + Math.cos(ang) * domeR,
          y: cy + domeY + Math.sin(ang) * domeR * 0.35,
        });
      }
      pts.push(row);
    }

    ctx.lineWidth = p.memberThickness;
    for (let r = 0; r < rings; r++) {
      const rowA = pts[r];
      const rowB = pts[r + 1];
      const na = rowA.length;
      const nb = rowB.length;
      for (let i = 0; i < nb; i++) {
        const b1 = rowB[i];
        const a1 = rowA[i % na];
        ctx.strokeStyle = lerpColor(palette[1], palette[3], r / rings);
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(b1.x, b1.y);
        ctx.stroke();
        const b2 = rowB[(i + 1) % nb];
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.stroke();
      }
    }
  },
});

const tensegrity: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(p.strutCount);
    const R = Math.min(w, h) * 0.36;
    const strutLen = R * (p.strutLength / 100);
    const twist = (p.twistAngle / 180) * Math.PI;

    const struts: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + t * 0.1;
      const cx0 = cx + Math.cos(ang) * R;
      const cy0 = cy + Math.sin(ang) * R;
      const dirAng = ang + Math.PI / 2 + twist;
      struts.push({
        x1: cx0 - (Math.cos(dirAng) * strutLen) / 2,
        y1: cy0 - (Math.sin(dirAng) * strutLen) / 2,
        x2: cx0 + (Math.cos(dirAng) * strutLen) / 2,
        y2: cy0 + (Math.sin(dirAng) * strutLen) / 2,
      });
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = lerpColor(palette[1], palette[2], 0.5);
    for (let i = 0; i < count; i++) {
      const a = struts[i];
      const b = struts[(i + 1) % count];
      ctx.beginPath();
      ctx.moveTo(a.x2, a.y2);
      ctx.lineTo(b.x1, b.y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }

    for (let i = 0; i < count; i++) {
      const s = struts[i];
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = lerpColor(palette[2], palette[3], i / count);
      ctx.lineWidth = p.memberThickness ? p.memberThickness * 2 : 3;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  },
});

const honeycombPanel: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const size = p.cellSize;
    const wobbleAmt = p.wobbleAmount / 100;
    const hexW = size * 2;
    const hexH = Math.sqrt(3) * size;
    const cols = Math.ceil(w / (hexW * 0.75)) + 2;
    const rows = Math.ceil(h / hexH) + 2;

    ctx.lineWidth = p.wallThickness;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * hexW * 0.75;
        const cy = row * hexH + (col % 2 !== 0 ? hexH / 2 : 0);
        const wobble = 1 + 0.06 * wobbleAmt * Math.sin(t * 0.5 + col * 0.7 + row * 1.1);

        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k;
          const x = cx + Math.cos(ang) * size * wobble;
          const y = cy + Math.sin(ang) * size * wobble;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = lerpColor(palette[1], palette[3], ((col + row + 100) % 7) / 7);
        ctx.stroke();
      }
    }
  },
});

const minimalSurfaceShell: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.round(p.gridDensity);
    const cellW = w / n;
    const cellH = h / n;
    const cx = w / 2;
    const cy = h / 2;
    const curvature = p.curvature / 100;
    const waveCount = p.waveCount;

    const grid: { x: number; y: number; z: number }[][] = [];
    for (let j = 0; j <= n; j++) {
      const row: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i <= n; i++) {
        const x = i * cellW;
        const y = j * cellH;
        const u = (x - cx) / (w * 0.5);
        const v = (y - cy) / (h * 0.5);
        const z = Math.sin(u * Math.PI * waveCount + t * 0.2) * Math.cos(v * Math.PI * waveCount) * curvature;
        row.push({ x, y: y + z * cellH * 1.2, z });
      }
      grid.push(row);
    }

    ctx.lineWidth = 1;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const node = grid[j][i];
        const shade = clamp((node.z + 1) / 2, 0, 1);
        ctx.strokeStyle = lerpColor(palette[1], palette[3], shade);
        if (i < n) {
          const right = grid[j][i + 1];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
        if (j < n) {
          const down = grid[j + 1][i];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(down.x, down.y);
          ctx.stroke();
        }
      }
    }
  },
});

// ---------------------------------------------------------------------------
// organic-spatial-boundary's 4 types are WaveContour family. Membrane-Like
// Partition and Flowing Boundary reuse drawWaveBand directly (horizontal
// bands genuinely fit both). Curvilinear Threshold needs a vertical curve
// (boundary lines run top-to-bottom, not left-to-right) and Nested Enclosure
// needs a radial contour (concentric shrinking loops) — neither axis fits
// drawWaveBand's horizontal-band signature, so they get their own thin
// sine-shaping code instead of forcing a transform trick onto it.
// ---------------------------------------------------------------------------
const curvilinearThreshold: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const bands = Math.round(p.bandCount);
    const curveAmt = (p.curvature / 100) * (w / bands) * 0.9;

    for (let b = 0; b < bands; b++) {
      const bx = (w / bands) * b + w / bands / 2;
      const phase = t * 0.2 + b * 0.9;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 6) {
        const yT = (y / h) * Math.PI * 2;
        const x = bx + Math.sin(yT + phase) * curveAmt;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = p.lineWidth / bands + 1;
      ctx.strokeStyle = lerpColor(palette[1], palette[2], b / bands);
      ctx.stroke();
    }
  },
});

const membraneLikePartition: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const amp = h * 0.18 * (p.membraneWaviness / 100);
    const freq = 0.006 * p.waveFrequency;
    const alpha = 1 - clamp(p.transparency / 100, 0, 1) * 0.75;

    drawWaveBand(ctx, w, h * 0.5, h, amp, t * 0.3, freq, 0, 0.3);
    ctx.fillStyle = lerpColor(palette[1], palette[3], 0.4);
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    drawWaveBand(ctx, w, h * 0.45, 0, amp * 0.8, t * 0.3 + 1.5, freq * 1.3, 0, 0.3);
    ctx.fillStyle = lerpColor(palette[0], palette[2], 0.5);
    ctx.globalAlpha = alpha * 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
  },
});

const nestedEnclosure: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const layers = Math.round(p.layerCount);
    const R = Math.min(w, h) * 0.42;
    const waviness = p.waviness / 100;

    for (let l = 0; l < layers; l++) {
      const layerT = l / Math.max(1, layers - 1);
      const radius = R * (1 - layerT * 0.75);
      const phase = t * 0.15 + l * 0.6;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
        const wobble = Math.sin(a * 4 + phase) * radius * 0.12 * waviness;
        const r = radius + wobble;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = lerpColor(palette[1], palette[3], layerT);
      ctx.lineWidth = p.lineWidth;
      ctx.stroke();
    }
  },
});

const flowingBoundary: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const amp = h * 0.22 * (p.flowAmplitude / 100);
    const freq = 0.005 * p.flowFrequency;
    const sharp = clamp(p.transitionSharpness / 100, 0, 1);

    drawWaveBand(ctx, w, h * 0.62, h, amp, t * 0.25, freq, sharp, 0.2);
    const grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.5, palette[1]);
    grad.addColorStop(1, palette[3]);
    ctx.fillStyle = grad;
    ctx.fill();
  },
});

// ---------------------------------------------------------------------------
// NoiseField engine — shared layered-sine value-noise (a simple fractional
// Brownian motion, consistent with the codebase's existing style of
// building organic texture from summed sine layers rather than a full
// Perlin/simplex implementation) for 3 of sensory-healing-pattern's 4
// types. They differ only in how the same scalar field is rendered:
// smooth gradient fill, quantized rhythm bands, or thin grain contour
// lines. The 4th type (Acoustic Diffusion) reuses forEachApertureCell
// (CellularLattice) instead, since a porous coral/honeycomb panel is a
// grid-of-apertures concept, not a continuous noise field.
// ---------------------------------------------------------------------------
function fbmNoise2D(x: number, y: number, t: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += Math.sin(x * freq * 0.02 + t * 0.2 * (o + 1)) * Math.cos(y * freq * 0.023 - t * 0.15) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

const biomorphicTexture: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const step = 6;
    const scale = p.noiseScale;
    const octaves = Math.round(p.octaves);
    const speed = p.flowSpeed / 100;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const n = fbmNoise2D(x * scale * 0.05, y * scale * 0.05, t * speed, octaves);
        const v = (n + 1) / 2;
        ctx.fillStyle = lerpColor(palette[1], palette[3], v);
        ctx.fillRect(x, y, step, step);
      }
    }
  },
});

const fractalVisualRhythm: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const step = 6;
    const scale = p.noiseScale;
    const bands = Math.round(p.bandCount);
    const speed = p.flowSpeed / 100;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const n = fbmNoise2D(x * scale * 0.05, y * scale * 0.05, t * speed, 3);
        const v = (n + 1) / 2;
        const banded = Math.floor(v * bands) / bands;
        ctx.fillStyle = lerpColor(palette[1], palette[3], banded);
        ctx.fillRect(x, y, step, step);
      }
    }
  },
});

const acousticDiffusionPattern: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const depthT = clamp(p.poreDepth / 100, 0, 1);
    const contrast = clamp(p.diffusionContrast / 100, 0, 1);

    forEachApertureCell(w, h, p.cellDensity, (cx, cy, cellW, cellH, row, col, rows, cols) => {
      const shimmer = 1 + 0.05 * Math.sin(t * 0.5 + row * 0.7 + col * 0.9);
      const r = Math.min(cellW, cellH) * 0.5 * (0.4 + depthT * 0.5) * shimmer;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${0.3 + contrast * 0.4})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(palette[1], palette[3], (row + col) / (rows + cols));
      ctx.fill();
    });
  },
});

const tactileNatureSurface: Factory = () => ({
  draw(ctx, w, h, t, p, palette) {
    ctx.clearRect(0, 0, w, h);
    const scale = p.grainScale;
    const lineCount = Math.round(p.grainDensity);
    const roughness = p.roughness / 100;

    for (let i = 0; i < lineCount; i++) {
      const baseY = (i / lineCount) * h;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const n = fbmNoise2D(x * scale * 0.04, baseY * scale * 0.04, t * 0.2, 3);
        const y = baseY + n * roughness * h * 0.04;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = lerpColor(palette[1], palette[3], i / lineCount);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
});

const registry: Record<string, Factory> = {
  selfShadingSkin,
  thermalMassUndulation,
  waveSectionWall,
  corrugatedThermalSkin,
  ribbedMassBuffer,
  rollingTopography,
  radialBloom,
  origamiFold,
  layeredPetalCascade,
  pneumaticPetal,
  curlingStripArray,
  bistableSnap,
  irisAperture,
  gradientThicknessMembrane,
  cellularSkinVoronoi,
  structuralVoronoiShell,
  densityGradedVoronoi,
  boneVoronoi,
  logarithmicShellSpiral,
  phyllotaxisFacade,
  spiralGrowthTower,
  radialFibonacciLouver,
  branchingStructuralColumn,
  recursiveCanopy,
  fractalVentilation,
  rootSystemFoundation,
  turingPatternSkin,
  cellularGrowthSimulation,
  coralGrowthPattern,
  diffusionLimitedAggregation,
  leafVenationStructural,
  fluidDynamicFacade,
  capillaryDrainage,
  branchingLoadPath,
  geodesicDome,
  tensegrity,
  honeycombPanel,
  minimalSurfaceShell,
  curvilinearThreshold,
  membraneLikePartition,
  nestedEnclosure,
  flowingBoundary,
  biomorphicTexture,
  fractalVisualRhythm,
  acousticDiffusionPattern,
  tactileNatureSurface,
  kineticFoldingPetals,
  shapeMemoryMembrane,
  voronoi,
  fibonacci,
  fractalTree,
  reactionDiffusion,
  veinFlow,
  structuralGeometry,
  organicBoundary,
  sensoryHealingPattern,
  staticShading,
  kineticResponsive,
  gradedPorosity,
  layeredOverlapping,
  shapeMemoryAlloy,
  hygromorphicMembrane,
  bimetallicStrip,
  pneumaticMembrane,
  fixedApertureGrid,
  deepWellShadow,
  directionalLouverAperture,
  graduatedPinhole,
};

export function createGenerator(key: string): GeneratorInstance {
  const factory = registry[key];
  return factory ? factory() : registry.voronoi();
}

// Explicit existence check — used by the completeness gate that decides
// whether a variant is ready for the JSON-driven explorer. createGenerator()
// itself silently falls back to voronoi on an unknown key, which is fine for
// rendering but would hide a typo'd/unimplemented generator name if that were
// the only check available.
export function hasGenerator(key: string): boolean {
  return key in registry;
}
