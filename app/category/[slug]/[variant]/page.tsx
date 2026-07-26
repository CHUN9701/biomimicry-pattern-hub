"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { getVariant } from "@/lib/data";
import type { SliderConfig } from "@/lib/data";
import {
  defaultMechanismForCategory,
  mechanismTypes,
  universalSliders,
} from "@/lib/mechanismTypes";
import {
  shapeMemorySliders,
  shapeMemoryTypes,
} from "@/lib/shapeMemoryTypes";
import { useScene } from "@/components/SceneProvider";
import BackButton from "@/components/BackButton";
import PlaygroundCanvas from "@/components/PlaygroundCanvas";
import MechanismTypeList from "@/components/MechanismTypeList";

// Build a fully-resolved default-params object from any slider list.
function defaultParamsFromSliders(sliders: SliderConfig[]): Record<string, number> {
  return Object.fromEntries(sliders.map((s) => [s.key, s.default]));
}

export default function VariantPage({
  params,
}: {
  params: { slug: string; variant: string };
}) {
  const { category, variant } = getVariant(params.slug, params.variant);
  const { setScene } = useScene();

  const isMembraneVariant = params.variant === "shape-memory-membrane";

  // The taxonomy this variant's 4 cards come from, plus the sliders to fall
  // back on when a type doesn't define its own. Today, every entry in
  // mechanismTypes.ts / shapeMemoryTypes.ts shares one universal slider set
  // (sliders is undefined on each of them) — future JSON-driven types will
  // carry their own `sliders` array per type, and this same code path picks
  // that up automatically without further changes here.
  const rawTypes = isMembraneVariant ? shapeMemoryTypes : mechanismTypes;
  const fallbackSliders = isMembraneVariant ? shapeMemorySliders : universalSliders;

  // Resolve every type to always have a concrete `sliders` array. This is the
  // single place fallback logic lives — downstream components never need to
  // know about "shared" vs "per-type" sliders, they just read `.sliders`.
  const resolvedTypes = rawTypes.map((t) => ({
    ...t,
    sliders: t.sliders ?? fallbackSliders,
  }));

  const initialKey = isMembraneVariant ? "sma" : defaultMechanismForCategory(params.slug);
  const initialType = resolvedTypes.find((t) => t.key === initialKey) ?? resolvedTypes[0];

  const [activeTypeKey, setActiveTypeKey] = useState(initialKey);
  const [sliderParams, setSliderParams] = useState<Record<string, number>>(() =>
    defaultParamsFromSliders(initialType.sliders)
  );

  useEffect(() => {
    if (category && variant) setScene({ level: "variant", category, variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, variant?.slug]);

  // Navigated to a different variant entirely — reset everything.
  useEffect(() => {
    const key = isMembraneVariant ? "sma" : defaultMechanismForCategory(params.slug);
    const type = resolvedTypes.find((t) => t.key === key) ?? resolvedTypes[0];
    setActiveTypeKey(key);
    setSliderParams(defaultParamsFromSliders(type.sliders));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, params.variant]);

  if (!category || !variant) notFound();

  // FIX (blocking issue 1): switching cards now updates activeKey AND resets
  // sliders + params to that type's own defaults, in the same event handler.
  // React batches these state updates, so there's never a render where the
  // slider list and params object have mismatched keys.
  const handleSelectType = (key: string) => {
    const type = resolvedTypes.find((t) => t.key === key) ?? resolvedTypes[0];
    setActiveTypeKey(key);
    setSliderParams(defaultParamsFromSliders(type.sliders));
  };

  const explorerTitle = isMembraneVariant ? "MEMBRANE MECHANISM TYPE" : "SKIN MECHANISM TYPE";
  const activeMechanism = resolvedTypes.find((t) => t.key === activeTypeKey) ?? resolvedTypes[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-28 md:px-10 md:py-32">
      <BackButton href={`/category/${category.slug}`} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 max-w-2xl"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-white/55">
          {category.title.toUpperCase()} &middot; VARIANT {variant.index}
        </p>
        <h1 className="mt-4 text-2xl font-semibold leading-snug md:text-4xl">
          {variant.title}
          <span className="ml-3 text-base font-normal text-white/50">{variant.titleZh}</span>
        </h1>
        <p className="mt-4 text-sm text-white/65 md:text-base">{variant.description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full flex-col gap-6 lg:flex-row lg:items-start"
      >
        <MechanismTypeList
          title={explorerTitle}
          types={resolvedTypes}
          activeKey={activeTypeKey}
          onSelect={handleSelectType}
          colors={category.colors}
        />
        <div className="flex-1">
          <PlaygroundCanvas
            colors={category.colors}
            generatorKey={activeMechanism.generator}
            sliders={activeMechanism.sliders}
            params={sliderParams}
            onParamsChange={setSliderParams}
          />
        </div>
      </motion.div>
    </div>
  );
}
