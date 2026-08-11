"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AMBIENT_COLORS } from "@/lib/data";
import { useScene } from "./SceneProvider";
import MeshGradientCanvas from "./MeshGradientCanvas";

export default function BackgroundField() {
  const { level, category } = useScene();
  const key = category?.slug ?? "ambient";
  const colors = category?.colors ?? AMBIENT_COLORS;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void">
      <AnimatePresence mode="sync">
        <motion.div
          key={key}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{
            opacity: level === "grid" ? 0.35 : level === "category" ? 1 : 0.55,
            scale: 1,
            filter: level === "variant" ? "blur(18px) brightness(0.55)" : "blur(0px) brightness(1)",
          }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MeshGradientCanvas colors={colors} speed={0.8} seed={key.length * 1.7} />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
    </div>
  );
}
