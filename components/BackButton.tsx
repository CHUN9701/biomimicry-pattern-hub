"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function BackButton({ href }: { href: string }) {
  const router = useRouter();
  return (
    <motion.button
      onClick={() => router.push(href)}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      whileHover={{ x: -4 }}
      whileTap={{ scale: 0.96 }}
      className="glass-panel fixed left-6 top-20 z-30 flex items-center gap-2 px-4 py-2 text-sm text-white/85 md:left-10"
    >
      <span aria-hidden="true">&larr;</span> Back
    </motion.button>
  );
}
