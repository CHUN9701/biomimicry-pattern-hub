"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { getCategory } from "@/lib/data";
import { useScene } from "@/components/SceneProvider";
import BackButton from "@/components/BackButton";
import VariantCard from "@/components/VariantCard";

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  const { setScene } = useScene();

  useEffect(() => {
    if (category) setScene({ level: "category", category, variant: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug]);

  if (!category) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 pb-24 pt-40 text-center md:px-10 md:pt-48">
      <BackButton href="/" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 max-w-2xl"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-white/55">
          {category.index} &middot; {category.subtitle.toUpperCase()}
        </p>
        <h1 className="mt-4 text-2xl font-semibold leading-snug md:text-4xl">{category.title}</h1>
        <p className="mt-4 text-sm text-white/65 md:text-base">{category.description}</p>
      </motion.div>

      <div className="flex w-full flex-wrap items-stretch justify-center gap-6">
        {category.variants.map((variant, i) => (
          <VariantCard key={variant.slug} category={category} variant={variant} index={i} />
        ))}
      </div>
    </div>
  );
}
