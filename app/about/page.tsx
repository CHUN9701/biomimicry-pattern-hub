export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 md:px-10">
      <p className="font-mono text-xs tracking-[0.3em] text-white/50">ABOUT</p>
      <h1 className="mt-4 text-3xl font-semibold md:text-4xl">Biomimicry Pattern Hub</h1>
      <p className="mt-6 text-white/70">
        A prototype exploring morphological adaptability design — the study of
        how living forms regulate climate, move, grow, and heal through
        geometry. Each category collects a family of biomimetic strategies and
        exposes the algorithm behind it as a live, adjustable playground.
      </p>
      <p className="mt-4 text-white/70">
        Built with Next.js, custom WebGL mesh-gradient shaders, and Framer
        Motion for the transitions between levels.
      </p>
    </div>
  );
}
