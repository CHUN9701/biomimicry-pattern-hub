// ============================================================================
// ORPHANED FILE (as of 97008c2) — imported by nothing.
//
// This was the second of two "universal 4-type taxonomy" files that drove the
// old split-screen explorer. Its sibling, lib/mechanismTypes.ts, was deleted
// once Part 2 finished replacing that generic framework with per-variant types
// in lib/biomimicry-subcategories.json. This file was kept rather than deleted
// alongside it, so it is now dead weight: app/category/[slug]/[variant]/
// page.tsx reads only lib/subcategoryTypes.ts (JSON) with a lib/data.ts
// fallback, and never imports this.
//
// It also keeps four generators alive on paper — shapeMemoryAlloy,
// hygromorphicMembrane, bimetallicStrip, pneumaticMembrane — which are
// registered in lib/generators.ts but unreachable from any live route because
// this file is their only consumer. They're marked ORPHANED there too.
//
// NOT to be confused with the live shape-memory-membrane variant, which is
// fully working and uses entirely different generators (curlingStripArray /
// irisAperture / bistableSnap / gradientThicknessMembrane).
//
// Safe to delete along with those four generators; kept for now as reference
// for the universal-slider approach. If reviving, note the taxonomy it
// describes overlaps the live shape-memory-membrane variant's 4 types.
// ============================================================================

import type { SliderConfig } from "./data";

export type MembraneType = {
  key: string;
  label: string;
  examples: string;
  description: string;
  generator: string;
  sliders?: SliderConfig[]; // optional — falls back to shapeMemorySliders when unset
};

// Climate-Responsive Shape-Memory Membrane — the second biomimicry taxonomy,
// covering material-level phase-change and moisture/pressure-driven skins
// rather than geometry-level shading. Mirrored the structure of the former
// lib/mechanismTypes.ts (deleted at 97008c2).
export const shapeMemoryTypes: MembraneType[] = [
  {
    key: "sma",
    label: "Shape Memory Alloy (SMA) Type",
    examples: "Nickel-titanium alloy panels",
    description: "Alloy undergoes phase transformation and deforms when heated.",
    generator: "shapeMemoryAlloy",
  },
  {
    key: "hygromorphic",
    label: "Hygromorphic Membrane Type",
    examples: "Wood-veneer composite panels",
    description: "Wood fiber composites bend in response to humidity (passive).",
    generator: "hygromorphicMembrane",
  },
  {
    key: "bimetallic",
    label: "Bimetallic / Thermobimetal Type",
    examples: "Thermobimetal louvre facades",
    description: "Bimetallic strips bend naturally when heated.",
    generator: "bimetallicStrip",
  },
  {
    key: "pneumatic",
    label: "Pneumatic Responsive Membrane Type",
    examples: "ETFE pneumatic cushion facades",
    description: "Inflation/deflation changes membrane tension and light transmission.",
    generator: "pneumaticMembrane",
  },
];

// Temperature / humidity / air-pressure are universal across all four membrane
// types — each type mostly reacts to the one slider relevant to its mechanism,
// but every slider stays visible and live regardless of which type is active.
export const shapeMemorySliders: SliderConfig[] = [
  { key: "temperature", label: "Temperature", min: -10, max: 60, step: 1, default: 24, unit: "°C" },
  { key: "humidity", label: "Humidity", min: 0, max: 100, step: 1, default: 50, unit: "%" },
  { key: "pressure", label: "Air Pressure / Inflation", min: 0, max: 100, step: 1, default: 45, unit: "%" },
];

export function getMembraneType(key: string): MembraneType {
  return shapeMemoryTypes.find((m) => m.key === key) ?? shapeMemoryTypes[0];
}

export function defaultShapeMemoryParams(): Record<string, number> {
  const init: Record<string, number> = {};
  shapeMemorySliders.forEach((s) => {
    init[s.key] = s.default;
  });
  return init;
}
