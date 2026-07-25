"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Category } from "@/lib/data";
import { useScene } from "./SceneProvider";
import MeshGradientCanvas from "./MeshGradientCanvas";

export default function CategoryCard({ category, index }: { category: Category; index: number }) {
  const router = useRouter();
  const { setScene } = useScene();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    setScene({ level: "category", category, variant: null });
    router.push(`/category/${category.slug}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel group relative flex h-72 flex-col justify-between overflow-hidden p-6 text-left md:h-80"
      style={{
        boxShadow: hovered
          ? `0 20px 60px -15px ${category.colors[1]}66, 0 0 0 1px ${category.colors[2]}55`
          : undefined,
      }}
    >
      <div className="absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-95">
        <MeshGradientCanvas colors={category.colors} speed={0.6} seed={index * 3.1 + 1} glow={hovered ? 1 : 0} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-25"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="70" stroke="white" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="45" stroke="white" strokeWidth="0.5" />
        <path d="M20 100 H180 M100 20 V180" stroke="white" strokeWidth="0.5" />
      </svg>

      <div className="relative z-10 text-xs font-mono tracking-[0.2em] text-white/70">
        {category.index}
      </div>
      <div className="relative z-10">
        <h3 className="text-xl font-semibold leading-snug text-white md:text-2xl">
          {category.title}
        </h3>
        <p className="mt-2 text-sm text-white/70">{category.subtitle}</p>
      </div>
    </motion.button>
  );
}
