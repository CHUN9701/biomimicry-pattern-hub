"use client";

import { useState } from "react";

/**
 * Copies the current address, which VariantScreen keeps in sync with every slider.
 *
 * A button rather than "just copy the address bar": the point of the state being
 * in the URL is that a student can put a specific configuration into a report or
 * hand it to a teacher, and that only happens if the affordance is visible where
 * the sliders are.
 */
export default function ShareLink({ notes }: { notes: string[] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused (permissions, insecure origin, older
      // browser). Select the address bar instead of pretending it worked.
      setCopied(false);
      window.prompt("複製這個連結:", window.location.href);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-xs tracking-wider text-white/70 transition hover:border-white/30 hover:text-white"
        >
          {copied ? "已複製連結 ✓" : "複製此設定的連結"}
        </button>
        <span className="text-xs text-white/40">
          連結包含目前的類型與所有參數值,可貼進報告或作業
        </span>
      </div>

      {/* A link can arrive hand-edited, truncated by a chat client, or written
          against an older version of a type. Saying what was adjusted is the
          difference between a reproducible figure and a number nobody can trust. */}
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg border border-amber-300/25 bg-amber-200/5 px-3 py-2 text-xs text-amber-100/80">
          {notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
