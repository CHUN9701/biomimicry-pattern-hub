import type { SliderConfig } from "./data";

export type MechanismType = {
  key: string;
  label: string;
  examples: string;
  description: string;
  generator: string;
  sliders?: SliderConfig[]; // optional — falls back to universalSliders when unset
};

// Self-Shading Perforated Skin — a functional/mechanism-based taxonomy from
// biomimicry architecture literature, deliberately independent of the app's own
// category/variant tree, so it reads the same way regardless of which category
// you drilled in from.
export const mechanismTypes: MechanismType[] = [
  {
    key: "static-shading",
    label: "Static Shading Type",
    examples: "Coral skeleton, Cactus ridges",
    description: "Fixed geometric form creates shading; does not respond to changing light.",
    generator: "staticShading",
  },
  {
    key: "kinetic-responsive",
    label: "Kinetic / Climate-Responsive Type",
    examples: "Al Bahar Towers",
    description: "Opens and closes automatically based on sun angle.",
    generator: "kineticResponsive",
  },
  {
    key: "graded-porosity",
    label: "Graded Porosity Type",
    examples: "Esplanade Theatre",
    description: "Perforation density varies continuously by orientation/solar intensity.",
    generator: "gradedPorosity",
  },
  {
    key: "layered-overlapping",
    label: "Layered / Overlapping Type",
    examples: "Pangolin scale-inspired panels",
    description: "Scale-like layering creates mutual shading.",
    generator: "layeredOverlapping",
  },
];

// Sun angle / wind / texture-scale sliders are universal across every mechanism type,
// so switching types on the left never hides or resets a control on the right.
export const universalSliders: SliderConfig[] = [
  { key: "sunAngle", label: "Sun Angle / Light Direction", min: 0, max: 180, step: 1, default: 45, unit: "°" },
  { key: "windSpeed", label: "Wind Direction / Speed", min: 0, max: 30, step: 0.5, default: 8, unit: " m/s" },
  { key: "textureScale", label: "Texture Scale / Porosity Size", min: 5, max: 100, step: 1, default: 40, unit: "%" },
];

export function getMechanismType(key: string): MechanismType {
  return mechanismTypes.find((m) => m.key === key) ?? mechanismTypes[0];
}

export function defaultMechanismForCategory(categorySlug: string): string {
  switch (categorySlug) {
    case "static-climate":
      return "static-shading";
    case "kinetic-responsive":
      return "kinetic-responsive";
    case "algorithmic-generative":
      return "graded-porosity";
    case "biophilic-sensory":
      return "layered-overlapping";
    default:
      return "static-shading";
  }
}

export function defaultUniversalParams(): Record<string, number> {
  const init: Record<string, number> = {};
  universalSliders.forEach((s) => {
    init[s.key] = s.default;
  });
  return init;
}
