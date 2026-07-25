"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Category, Variant } from "@/lib/data";
import { useScene } from "./SceneProvider";

export default function VariantCard({
  category,
  variant,
  index,
}: {
  category: Category;
  variant: Variant;
  index: number;
}) {
  const router = useRouter();
  const { setScene } = useScene();

  const handleClick = () => {
    setScene({ level: "variant", variant });
    router.push(`/category/${category.slug}/${variant.slug}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.25 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel glass-panel-glow w-full max-w-sm p-6 text-left"
    >
      <div className="flex items-baseline justify-between text-xs font-mono tracking-[0.2em] text-white/60">
        <span>Variant {variant.index}</span>
        <span>{variant.titleZh}</span>
      </div>
      <h4 className="mt-3 text-lg font-semibold text-white">{variant.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{variant.description}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/80">
        Open playground <span aria-hidden="true">&rarr;</span>
      </div>
    </motion.button>
  );
}
