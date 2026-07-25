# Biomimicry Pattern Hub

A prototype exploring **Morphological Adaptability Design** — patterns
borrowed from living systems, rendered as live, adjustable playgrounds.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + custom glassmorphism (`backdrop-filter: blur(20px)`, glowing borders)
- Hand-written WebGL fragment shader for the mesh-gradient backgrounds
  (domain-warped simplex noise blended between four palette colors, plus
  drifting color pools)
- Framer Motion for page/level transitions and micro-interactions
- Canvas2D for the Level 3 interactive simulations (Voronoi, Fibonacci
  phyllotaxis, fractal branching, Gray-Scott reaction-diffusion,
  space-colonization vein flow, structural load grid, and more)

## Structure

- **Level 1** (`app/page.tsx`) — grid of 4 category cards, each with its
  own live mesh-gradient canvas.
- **Level 2** (`app/category/[slug]/page.tsx`) — clicking a card morphs
  its gradient into the full-screen background and reveals that
  category's variants.
- **Level 3** (`app/category/[slug]/[variant]/page.tsx`) — an interactive
  canvas playground per variant, with sliders driving the simulation
  parameters in real time.

Category and variant metadata (titles, descriptions, color palettes,
slider configs) live in `lib/data.ts`. The Canvas2D simulations live in
`lib/generators.ts`; the WebGL shader source lives in `lib/shaders.ts`.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Known trade-offs

- Node.js dependencies are pinned to `next@14.2.35` (not the latest
  major) to avoid an App Router migration; `npm audit` still flags a
  couple of high-severity advisories in that line, all in
  production/self-hosted-server code paths (middleware, RSC edge
  cases) that don't affect local development. Worth revisiting before
  any real deployment.
- Uses raw WebGL (no Three.js/R3F) for the mesh gradients — lighter
  dependency footprint for the same visual effect.
