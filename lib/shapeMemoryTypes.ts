import type { SliderConfig } from "./data";

export type MembraneType = {
  key: string;
  label: string;
  examples: string;
  description: string;
  generator: string;
};

// Climate-Responsive Shape-Memory Membrane — the second biomimicry taxonomy,
// covering material-level phase-change and moisture/pressure-driven skins
// rather than geometry-level shading. Mirrors the structure of mechanismTypes.ts.
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
