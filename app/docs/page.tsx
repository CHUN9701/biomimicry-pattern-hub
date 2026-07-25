const sections = [
  {
    title: "Navigation",
    body: "Level 1 is the category grid. Clicking a card zooms its gradient into the full-screen background and reveals its variants (Level 2). Clicking a variant opens an interactive playground (Level 3).",
  },
  {
    title: "Playgrounds",
    body: "Each variant renders a live Canvas2D simulation — Voronoi tessellation, phyllotaxis spirals, fractal branching, Gray-Scott reaction-diffusion, space-colonization venation, and more. Sliders drive the simulation parameters in real time.",
  },
  {
    title: "Backgrounds",
    body: "Mesh gradients are rendered with a hand-written WebGL fragment shader combining domain-warped simplex noise with moving color pools, tuned per category.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 md:px-10">
      <p className="font-mono text-xs tracking-[0.3em] text-white/50">DOCS</p>
      <h1 className="mt-4 text-3xl font-semibold md:text-4xl">How this prototype works</h1>
      <div className="mt-10 flex flex-col gap-8">
        {sections.map((s) => (
          <div key={s.title} className="glass-panel p-6">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-white/65">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
