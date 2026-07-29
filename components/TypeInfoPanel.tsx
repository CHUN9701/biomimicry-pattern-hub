"use client";

import { motion } from "framer-motion";

export type TypeInfo = {
  label: string;
  labelZh?: string;
  description?: string;
  example?: string;
  principle?: string;
  spatialApplication?: string;
};

/**
 * Explains the type currently on the canvas: what it is, how the pattern comes
 * about, and how it gets used in spatial design.
 *
 * Sits full-width below the canvas and the parameter panel, but lays its
 * sections out in columns rather than one wide block — a single column spanning
 * the full desktop width would run well past a comfortable reading measure.
 *
 * Sections are only rendered when the JSON actually carries them, so the types
 * that haven't been written up yet degrade to just "what it is" instead of
 * showing empty headings. Column count follows the number of present sections
 * so a lone section doesn't sit in a third of the width.
 */
export default function TypeInfoPanel({ info, accent }: { info: TypeInfo; accent: string }) {
  const whatItIs = [info.description, info.example && `案例：${info.example}`]
    .filter(Boolean)
    .join("\n");

  const sections = [
    { key: "what", en: "WHAT IT IS", zh: "這是什麼", body: whatItIs },
    { key: "principle", en: "HOW IT FORMS", zh: "生成原理", body: info.principle },
    { key: "application", en: "IN SPATIAL DESIGN", zh: "空間設計運用", body: info.spatialApplication },
  ].filter((s): s is { key: string; en: string; zh: string; body: string } => Boolean(s.body));

  if (sections.length === 0) return null;

  const cols =
    sections.length >= 3
      ? "md:grid-cols-2 lg:grid-cols-3"
      : sections.length === 2
        ? "md:grid-cols-2"
        : "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel mt-6 w-full p-6 md:p-8"
      aria-label="Type explanation"
    >
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-white/90 md:text-lg">{info.label}</h2>
        {info.labelZh && <span className="text-sm text-white/50">{info.labelZh}</span>}
      </div>

      <div className={`grid gap-x-8 gap-y-6 ${cols}`}>
        {sections.map((s) => (
          <div key={s.key}>
            <h3 className="flex items-baseline gap-2">
              <span
                className="font-mono text-[0.65rem] tracking-[0.22em]"
                style={{ color: accent }}
              >
                {s.en}
              </span>
              <span className="text-xs text-white/45">{s.zh}</span>
            </h3>
            <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-relaxed text-white/70">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
