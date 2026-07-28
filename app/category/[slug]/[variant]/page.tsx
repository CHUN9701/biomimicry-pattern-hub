"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { getVariant } from "@/lib/data";
import type { SliderConfig } from "@/lib/data";
import {
  getSubcategoryTypes,
  getValidatedSliders,
  isVariantExplorerReady,
} from "@/lib/subcategoryTypes";
import { useScene } from "@/components/SceneProvider";
import BackButton from "@/components/BackButton";
import PlaygroundCanvas from "@/components/PlaygroundCanvas";
import MechanismTypeList from "@/components/MechanismTypeList";

// Build a fully-resolved default-params object from any slider list.
function defaultParamsFromSliders(sliders: SliderConfig[]): Record<string, number> {
  return Object.fromEntries(sliders.map((s) => [s.key, s.default]));
}

type ResolvedType = {
  key: string;
  label: string;
  examples: string;
  description?: string;
  generator: string;
  sliders: SliderConfig[];
};

// The old universal 4-type taxonomies are not imported here — this page reads
// exclusively from lib/biomimicry-subcategories.json, per variant. A variant
// that isn't fully speced yet falls back to its OWN single generator
// (lib/data.ts), never to a generic stand-in. (mechanismTypes.ts has since
// been deleted; shapeMemoryTypes.ts remains on disk but unused.)
//
// Only ever called behind isVariantExplorerReady(), which already requires
// every type to have a registered generator and fully valid sliders — so the
// non-null assertions below are guaranteed, not hopeful. getValidatedSliders
// is used rather than reading t.sliders directly so a malformed slider set
// can't reach the UI even if this is ever called out of order.
function resolveExplorerTypes(variantSlug: string): ResolvedType[] {
  const jsonTypes = getSubcategoryTypes(variantSlug) ?? [];
  return jsonTypes.flatMap((t) => {
    const sliders = getValidatedSliders(t);
    if (!t.generator || !sliders) return [];
    return [
      {
        key: t.slug ?? String(t.id),
        label: t.name,
        examples: t.example,
        description: t.description,
        generator: t.generator,
        sliders,
      },
    ];
  });
}

export default function VariantPage({
  params,
}: {
  params: { slug: string; variant: string };
}) {
  const { category, variant } = getVariant(params.slug, params.variant);
  const { setScene } = useScene();

  const explorerReady = isVariantExplorerReady(params.variant);
  const resolvedTypes = explorerReady ? resolveExplorerTypes(params.variant) : [];

  const fallbackGenerator = variant?.generator ?? "voronoi";
  const fallbackSliders = variant?.sliders ?? [];

  const initialType = resolvedTypes[0];
  const initialKey = initialType?.key ?? "__fallback__";
  const initialSliders = explorerReady && initialType ? initialType.sliders : fallbackSliders;

  const [activeTypeKey, setActiveTypeKey] = useState(initialKey);
  const [sliderParams, setSliderParams] = useState<Record<string, number>>(() =>
    defaultParamsFromSliders(initialSliders)
  );

  useEffect(() => {
    if (category && variant) setScene({ level: "variant", category, variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, variant?.slug]);

  // Navigated to a different variant entirely — recompute readiness fresh
  // and reset selection + params for whichever mode this variant is in.
  useEffect(() => {
    const ready = isVariantExplorerReady(params.variant);
    const types = ready ? resolveExplorerTypes(params.variant) : [];
    const first = types[0];
    if (ready && first) {
      setActiveTypeKey(first.key);
      setSliderParams(defaultParamsFromSliders(first.sliders));
    } else {
      setActiveTypeKey("__fallback__");
      setSliderParams(defaultParamsFromSliders(variant?.sliders ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, params.variant]);

  if (!category || !variant) notFound();

  // FIX (blocking issue 1, still applies): switching cards updates activeKey
  // AND resets sliders + params to that type's own defaults in one handler.
  const handleSelectType = (key: string) => {
    const type = resolvedTypes.find((t) => t.key === key) ?? resolvedTypes[0];
    if (!type) return;
    setActiveTypeKey(key);
    setSliderParams(defaultParamsFromSliders(type.sliders));
  };

  const activeMechanism = explorerReady
    ? resolvedTypes.find((t) => t.key === activeTypeKey) ?? resolvedTypes[0]
    : null;

  const activeGeneratorKey = activeMechanism?.generator ?? fallbackGenerator;
  const activeSliders = activeMechanism?.sliders ?? fallbackSliders;

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
        className={explorerReady ? "flex w-full flex-col gap-6 lg:flex-row lg:items-start" : "w-full"}
      >
        {explorerReady && (
          <MechanismTypeList
            title="MECHANISM TYPE"
            types={resolvedTypes}
            activeKey={activeTypeKey}
            onSelect={handleSelectType}
            colors={category.colors}
          />
        )}
        <div className={explorerReady ? "flex-1" : "w-full"}>
          <PlaygroundCanvas
            colors={category.colors}
            generatorKey={activeGeneratorKey}
            sliders={activeSliders}
            params={sliderParams}
            onParamsChange={setSliderParams}
          />
        </div>
      </motion.div>
    </div>
  );
}
