"use client";

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { getVariant } from "@/lib/data";
import {
  defaultMechanismForCategory,
  defaultUniversalParams,
  getMechanismType,
  mechanismTypes,
  universalSliders,
} from "@/lib/mechanismTypes";
import {
  defaultShapeMemoryParams,
  getMembraneType,
  shapeMemorySliders,
  shapeMemoryTypes,
} from "@/lib/shapeMemoryTypes";
import { useScene } from "@/components/SceneProvider";
import BackButton from "@/components/BackButton";
import PlaygroundCanvas from "@/components/PlaygroundCanvas";
import MechanismTypeList from "@/components/MechanismTypeList";

export default function VariantPage({
  params,
}: {
  params: { slug: string; variant: string };
}) {
  const { category, variant } = getVariant(params.slug, params.variant);
  const { setScene } = useScene();

  // The "shape-memory-membrane" variant is the one page that's actually about
  // Climate-Responsive Shape-Memory Membrane — it gets that taxonomy's explorer
  // (temperature/humidity/pressure) instead of the skin-shading one.
  const isMembraneVariant = params.variant === "shape-memory-membrane";

  const [activeTypeKey, setActiveTypeKey] = useState(() =>
    isMembraneVariant ? "sma" : defaultMechanismForCategory(params.slug)
  );
  const [sliderParams, setSliderParams] = useState<Record<string, number>>(() =>
    isMembraneVariant ? defaultShapeMemoryParams() : defaultUniversalParams()
  );
  const sliderParamsRef = useRef(sliderParams);
  sliderParamsRef.current = sliderParams;

  useEffect(() => {
    if (category && variant) setScene({ level: "variant", category, variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, variant?.slug]);

  useEffect(() => {
    if (isMembraneVariant) {
      setActiveTypeKey("sma");
      setSliderParams(defaultShapeMemoryParams());
    } else {
      setActiveTypeKey(defaultMechanismForCategory(params.slug));
      setSliderParams(defaultUniversalParams());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, params.variant]);

  if (!category || !variant) notFound();

  const explorerTypes = isMembraneVariant ? shapeMemoryTypes : mechanismTypes;
  const explorerSliders = isMembraneVariant ? shapeMemorySliders : universalSliders;
  const explorerTitle = isMembraneVariant ? "MEMBRANE MECHANISM TYPE" : "SKIN MECHANISM TYPE";
  const activeMechanism = isMembraneVariant
    ? getMembraneType(activeTypeKey)
    : getMechanismType(activeTypeKey);

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
          types={explorerTypes}
          activeKey={activeTypeKey}
          onSelect={setActiveTypeKey}
          colors={category.colors}
          paramsRef={sliderParamsRef}
        />
        <div className="flex-1">
          <PlaygroundCanvas
            colors={category.colors}
            generatorKey={activeMechanism.generator}
            sliders={explorerSliders}
            params={sliderParams}
            onParamsChange={setSliderParams}
          />
        </div>
      </motion.div>
    </div>
  );
}
