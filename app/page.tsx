"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { categories } from "@/lib/data";
import CategoryCard from "@/components/CategoryCard";
import { useScene } from "@/components/SceneProvider";

export default function HomePage() {
  const { setScene } = useScene();

  useEffect(() => {
    setScene({ level: "grid", category: null, variant: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32 md:px-10 md:pt-40">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 max-w-2xl"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-white/50">
          MORPHOLOGICAL ADAPTABILITY DESIGN
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
          Patterns borrowed from living systems.
        </h1>
        <p className="mt-4 text-base text-white/60 md:text-lg">
          Four families of biomimetic morphology, each an entry point into the
          algorithms and mechanics behind it. Choose a pattern to drill in.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {categories.map((category, i) => (
          <CategoryCard key={category.slug} category={category} index={i} />
        ))}
      </div>
    </div>
  );
}
