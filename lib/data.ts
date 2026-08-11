/**
 * A mark on the slider track at a position where the BEHAVIOUR changes — not
 * decoration (docs/OPEN-ITEMS.md A4). Without it, a student dragging
 * bistable-snap's trigger from 0 to 35 sees nothing move and concludes the
 * slider is broken, when in fact the whole snap happens in the next 15%.
 */
export type SliderTick = {
  at: number;
  labelZh: string;
};

export type SliderConfig = {
  key: string;
  label: string;
  /** Traditional Chinese gloss shown beside the English label. */
  labelZh?: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /**
   * How this slider's value combines with the canvas's physical extent to
   * produce the count the generator actually draws. Present only on the
   * count-derived sliders; a plain shaping slider (an angle, a percentage) has
   * none.
   *
   *  gridPitch   spacing across a 2D grid — cols from width, rows from height
   *  linePitch   spacing across the WIDTH (vertical ribs, grid lines)
   *  rowPitch    spacing down the HEIGHT (stacked bands, grain lines)
   *  wavelength  one full wave's length
   *  areaDensity points per m², so the count follows the area
   *
   * Which one applies is decided by what the generator draws, not by what the
   * slider used to be called.
   */
  derive?: "gridPitch" | "linePitch" | "rowPitch" | "wavelength" | "areaDensity";
  /** Unit the derive value is expressed in. Defaults to mm. */
  deriveUnit?: "mm" | "m";
  ticks?: SliderTick[];
  /** States what the ticks were computed from, so they aren't read as absolute. */
  ticksNote?: string;
};

export type Variant = {
  slug: string;
  index: string;
  title: string;
  titleZh: string;
  description: string;
  generator: string;
  sliders: SliderConfig[];
};

export type Category = {
  slug: string;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  colors: [string, string, string, string];
  variants: Variant[];
};

/**
 * Background palette when no category is selected. Here rather than in
 * BackgroundField.tsx because standalone.html paints the same field and the two
 * builds must open on the same colour.
 */
export const AMBIENT_COLORS: [string, string, string, string] = [
  "#0a0a0a",
  "#161616",
  "#1c1c1c",
  "#232323",
];

export const categories: Category[] = [
  {
    slug: "static-climate",
    index: "01",
    title: "Static Climate-Regulating Morphology",
    subtitle: "Thermal resistance & self-shading",
    description:
      "Passive forms that regulate heat through geometry alone — perforation, mass, and shadow, borrowed from termite mounds and desert flora.",
    colors: ["#3a0f08", "#c5451f", "#f2884a", "#fbd28a"],
    variants: [
      {
        slug: "self-shading-skin",
        index: "A",
        title: "Static Shading Perforated Skin",
        titleZh: "靜態遮蔭穿孔表皮",
        description:
          "Aperture size scales inversely with solar incidence, casting deep shadow wells that keep the interior cool.",
        generator: "selfShadingSkin",
        sliders: [
          { key: "sunAngle", label: "Sun Angle", min: 0, max: 90, step: 1, default: 35, unit: "°" },
          { key: "density", label: "Aperture Density", min: 8, max: 40, step: 1, default: 20 },
          { key: "shadowDepth", label: "Shadow Depth", min: 0, max: 100, step: 1, default: 60, unit: "%" },
        ],
      },
      {
        slug: "thermal-mass-undulation",
        index: "B",
        title: "Thermal Mass Undulation",
        titleZh: "熱塊體波狀起伏",
        description:
          "A thick relief skin that stores and releases heat slowly, its ripple depth tuned to ambient temperature.",
        generator: "thermalMassUndulation",
        sliders: [
          { key: "temperature", label: "Temperature", min: -10, max: 45, step: 1, default: 22, unit: "°C" },
          { key: "reliefDepth", label: "Relief Depth", min: 0, max: 100, step: 1, default: 50, unit: "%" },
          { key: "thermalLag", label: "Thermal Lag", min: 0, max: 100, step: 1, default: 40, unit: "%" },
        ],
      },
    ],
  },
  {
    slug: "kinetic-responsive",
    index: "02",
    title: "Kinetic & Responsive Morphology",
    subtitle: "Mechanical folding & active adaptation",
    description:
      "Structures that move — folding, curling, and flexing in real time to answer wind, light, and touch.",
    colors: ["#0b1140", "#2946c9", "#7c5cf0", "#c9a8ff"],
    variants: [
      {
        slug: "kinetic-folding-petals",
        index: "A",
        title: "Kinetic Folding Petals",
        titleZh: "動態摺疊花瓣",
        description:
          "A phyllotaxis array of petals that opens and closes in response to simulated wind load.",
        generator: "kineticFoldingPetals",
        sliders: [
          { key: "windSpeed", label: "Wind Speed", min: 0, max: 30, step: 0.5, default: 8, unit: "m/s" },
          { key: "petalCount", label: "Petal Count", min: 5, max: 18, step: 1, default: 10 },
          { key: "foldAngle", label: "Base Fold Angle", min: 0, max: 90, step: 1, default: 30, unit: "°" },
        ],
      },
      {
        slug: "shape-memory-membrane",
        index: "B",
        title: "Shape-Memory Alloy Membrane",
        titleZh: "形狀記憶薄膜",
        description:
          "A grid of shape-memory alloy strips that curl progressively as temperature rises, self-shading the surface.",
        generator: "shapeMemoryMembrane",
        sliders: [
          { key: "temperature", label: "Temperature", min: -10, max: 45, step: 1, default: 24, unit: "°C" },
          { key: "stiffness", label: "Membrane Stiffness", min: 0, max: 100, step: 1, default: 50, unit: "%" },
          { key: "curl", label: "Curl Amount", min: 0, max: 100, step: 1, default: 55, unit: "%" },
        ],
      },
    ],
  },
  {
    slug: "algorithmic-generative",
    index: "03",
    title: "Algorithmic & Generative Structure",
    subtitle: "Voronoi & vein-flow mathematics",
    description:
      "Growth rendered as computation — tessellation, spirals, branching, and reaction-diffusion made visible.",
    colors: ["#031622", "#0a4a6b", "#1fa6c9", "#a8e9f0"],
    variants: [
      {
        slug: "voronoi",
        index: "01",
        title: "Voronoi Tessellation",
        titleZh: "泰森多邊形",
        description: "Cellular tessellation grown from scattered seed points, echoing dragonfly wings and dried mud.",
        generator: "voronoi",
        sliders: [
          { key: "cellCount", label: "Cell Count", min: 8, max: 80, step: 1, default: 32 },
          { key: "jitter", label: "Jitter", min: 0, max: 100, step: 1, default: 45, unit: "%" },
          { key: "lineWidth", label: "Line Width", min: 1, max: 6, step: 0.5, default: 1.5, unit: "px" },
        ],
      },
      {
        slug: "fibonacci",
        index: "02",
        title: "Fibonacci Spiral",
        titleZh: "斐波那契螺旋",
        description: "Golden-angle phyllotaxis — the packing logic behind sunflower heads and pinecones.",
        generator: "fibonacci",
        sliders: [
          { key: "angleOffset", label: "Golden Angle Offset", min: -10, max: 10, step: 0.1, default: 0, unit: "°" },
          { key: "pointCount", label: "Point Count", min: 50, max: 800, step: 10, default: 300 },
          { key: "growthRate", label: "Growth Rate", min: 2, max: 14, step: 0.5, default: 6 },
        ],
      },
      {
        slug: "fractal-tree",
        index: "03",
        title: "Fractal Tree",
        titleZh: "分形樹形",
        description: "Recursive branching that mirrors vascular and arboreal growth patterns.",
        generator: "fractalTree",
        sliders: [
          { key: "branchAngle", label: "Branch Angle", min: 5, max: 60, step: 1, default: 24, unit: "°" },
          { key: "depth", label: "Recursion Depth", min: 3, max: 12, step: 1, default: 9 },
          { key: "lengthRatio", label: "Length Ratio", min: 0.5, max: 0.85, step: 0.01, default: 0.72 },
        ],
      },
      {
        slug: "reaction-diffusion",
        index: "04",
        title: "Reaction-Diffusion",
        titleZh: "反應擴散",
        description: "A Gray-Scott simulation — the chemistry behind zebra stripes and coral texture.",
        generator: "reactionDiffusion",
        sliders: [
          { key: "feedRate", label: "Feed Rate", min: 0.02, max: 0.08, step: 0.001, default: 0.037 },
          { key: "killRate", label: "Kill Rate", min: 0.05, max: 0.07, step: 0.001, default: 0.06 },
          { key: "diffusionSpeed", label: "Diffusion Speed", min: 1, max: 8, step: 1, default: 4 },
        ],
      },
      {
        slug: "vein-flow",
        index: "05",
        title: "Vein Flow",
        titleZh: "葉脈流體",
        description: "Space-colonization venation — the distribution logic of leaves and river deltas.",
        generator: "veinFlow",
        sliders: [
          { key: "growthSpeed", label: "Growth Speed", min: 1, max: 10, step: 1, default: 5 },
          { key: "branchProbability", label: "Branch Probability", min: 0, max: 100, step: 1, default: 35, unit: "%" },
          { key: "density", label: "Attractor Density", min: 20, max: 200, step: 5, default: 90 },
        ],
      },
      {
        slug: "structural-geometry",
        index: "06",
        title: "Structural Geometry",
        titleZh: "結構幾何",
        description: "A triangulated load grid that deforms toward its applied load angle, like a diagrid facade.",
        generator: "structuralGeometry",
        sliders: [
          { key: "loadAngle", label: "Load Angle", min: 0, max: 360, step: 1, default: 90, unit: "°" },
          { key: "memberThickness", label: "Member Thickness", min: 1, max: 6, step: 0.5, default: 2, unit: "px" },
          { key: "gridDensity", label: "Grid Density", min: 6, max: 24, step: 1, default: 12 },
        ],
      },
    ],
  },
  {
    slug: "biophilic-sensory",
    index: "04",
    title: "Biophilic Geometry & Sensory Healing",
    subtitle: "Natural integration & spatial boundaries",
    description:
      "Soft, calming geometries designed for the nervous system — gentle boundaries and organic texture over hard lines.",
    colors: ["#141a08", "#586b1f", "#a6c96b", "#eee7c0"],
    variants: [
      {
        slug: "organic-spatial-boundary",
        index: "A",
        title: "Organic Spatial Boundary",
        titleZh: "有機空間邊界",
        description: "A layered, curved partition that filters light and sound without a single hard corner.",
        generator: "organicBoundary",
        sliders: [
          { key: "curvature", label: "Curvature", min: 0, max: 100, step: 1, default: 55, unit: "%" },
          { key: "porosity", label: "Porosity", min: 0, max: 100, step: 1, default: 40, unit: "%" },
          { key: "lightAngle", label: "Light Angle", min: 0, max: 180, step: 1, default: 45, unit: "°" },
        ],
      },
      {
        slug: "sensory-healing-pattern",
        index: "B",
        title: "Sensory Healing Pattern",
        titleZh: "感官療癒紋理",
        description: "A slow-drifting, blended texture tuned for visual calm — modeled on wood grain and stone.",
        generator: "sensoryHealingPattern",
        sliders: [
          { key: "softness", label: "Softness", min: 0, max: 100, step: 1, default: 65, unit: "%" },
          { key: "patternScale", label: "Pattern Scale", min: 1, max: 10, step: 0.5, default: 4 },
          { key: "calmFactor", label: "Calm Factor", min: 0, max: 100, step: 1, default: 70, unit: "%" },
        ],
      },
    ],
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getVariant(categorySlug: string, variantSlug: string) {
  const category = getCategory(categorySlug);
  const variant = category?.variants.find((v) => v.slug === variantSlug);
  return { category, variant };
}
