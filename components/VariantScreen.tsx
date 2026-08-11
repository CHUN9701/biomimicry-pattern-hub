"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { getVariant } from "@/lib/data";
import type { SliderConfig } from "@/lib/data";
import {
  getScaleTier,
  getSubcategoryTypes,
  getValidatedSliders,
  isVariantExplorerReady,
} from "@/lib/subcategoryTypes";
import { SCALE_PARAM_KEY, SCALE_TIERS, type ScaleTier } from "@/lib/scale";
import { useScene } from "@/components/SceneProvider";
import BackButton from "@/components/BackButton";
import PlaygroundCanvas from "@/components/PlaygroundCanvas";
import MechanismTypeList from "@/components/MechanismTypeList";
import TypeInfoPanel from "@/components/TypeInfoPanel";

// Build a fully-resolved default-params object from any slider list. The
// physical extent is seeded here too: it isn't one of the type's own sliders
// (it lives below the canvas, not in the parameter panel), but the generator
// reads it from the same params object, so a type declaring a tier must start
// with that tier's default width already present.
function defaultParams(
  sliders: SliderConfig[],
  scaleTier?: ScaleTier | null
): Record<string, number> {
  const base = Object.fromEntries(sliders.map((s) => [s.key, s.default]));
  if (scaleTier) base[SCALE_PARAM_KEY] = SCALE_TIERS[scaleTier].defaultM;
  return base;
}

type ResolvedType = {
  key: string;
  label: string;
  labelZh?: string;
  examples: string;
  description?: string;
  principle?: string;
  spatialApplication?: string;
  generator: string;
  sliders: SliderConfig[];
  scaleTier: ScaleTier | null;
  scaleNoteZh?: string;
};

// The old universal 4-type taxonomies are not imported here — this screen reads
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
        principle: t.principle,
        spatialApplication: t.spatialApplication,
        generator: t.generator,
        sliders,
        scaleTier: getScaleTier(t),
        scaleNoteZh: t.scaleNoteZh,
      },
    ];
  });
}

export default function VariantScreen({
  slug,
  variantSlug,
}: {
  slug: string;
  variantSlug: string;
}) {
  const { category, variant } = getVariant(slug, variantSlug);
  const { setScene } = useScene();

  const explorerReady = isVariantExplorerReady(variantSlug);
  const resolvedTypes = explorerReady ? resolveExplorerTypes(variantSlug) : [];

  const fallbackGenerator = variant?.generator ?? "voronoi";
  const fallbackSliders = variant?.sliders ?? [];

  const initialType = resolvedTypes[0];
  const initialKey = initialType?.key ?? "__fallback__";
  const initialSliders = explorerReady && initialType ? initialType.sliders : fallbackSliders;

  const [activeTypeKey, setActiveTypeKey] = useState(initialKey);
  const [sliderParams, setSliderParams] = useState<Record<string, number>>(() =>
    defaultParams(initialSliders, explorerReady && initialType ? initialType.scaleTier : null)
  );

  useEffect(() => {
    if (category && variant) setScene({ level: "variant", category, variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, variant?.slug]);

  // Navigated to a different variant entirely — recompute readiness fresh
  // and reset selection + params for whichever mode this variant is in.
  useEffect(() => {
    const ready = isVariantExplorerReady(variantSlug);
    const types = ready ? resolveExplorerTypes(variantSlug) : [];
    const first = types[0];
    if (ready && first) {
      setActiveTypeKey(first.key);
      setSliderParams(defaultParams(first.sliders, first.scaleTier));
    } else {
      setActiveTypeKey("__fallback__");
      // The lib/data.ts fallback path declares no tier, so no scale slider.
      setSliderParams(defaultParams(variant?.sliders ?? [], null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, variantSlug]);

  if (!category || !variant) notFound();

  // FIX (blocking issue 1, still applies): switching cards updates activeKey
  // AND resets sliders + params to that type's own defaults in one handler.
  const handleSelectType = (key: string) => {
    const type = resolvedTypes.find((t) => t.key === key) ?? resolvedTypes[0];
    if (!type) return;
    setActiveTypeKey(key);
    setSliderParams(defaultParams(type.sliders, type.scaleTier));
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
          {/* CJK has no word boundaries, so as an inline span this used to break
              mid-phrase on narrow screens — leaving a single orphaned character
              at the end of a line. nowrap keeps it whole (longest is 8 chars,
              safe down to 320px), and on mobile it drops to its own line as a
              subtitle instead of trailing the wrapped English title. */}
          <span className="mt-1 block whitespace-nowrap text-base font-normal text-white/50 md:ml-3 md:mt-0 md:inline">
            {variant.titleZh}
          </span>
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
            scaleTier={activeMechanism?.scaleTier ?? null}
            scaleNoteZh={activeMechanism?.scaleNoteZh}
          />
        </div>
      </motion.div>

      {/* Explanation of whatever is currently on the canvas. Falls back to the
          variant's own copy when this variant has no per-type explorer. */}
      <TypeInfoPanel
        key={activeMechanism?.key ?? "__fallback__"}
        accent={category.colors[2]}
        info={
          activeMechanism
            ? {
                label: activeMechanism.label,
                description: activeMechanism.description,
                example: activeMechanism.examples,
                principle: activeMechanism.principle,
                spatialApplication: activeMechanism.spatialApplication,
              }
            : { label: variant.title, labelZh: variant.titleZh, description: variant.description }
        }
      />
    </div>
  );
}
