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
// 01A Self-Shading Perforated Skin
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

const registry: Record<string, Factory> = {
  selfShadingSkin,
  thermalMassUndulation,
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
};

export function createGenerator(key: string): GeneratorInstance {
  const factory = registry[key];
  return factory ? factory() : registry.voronoi();
}
