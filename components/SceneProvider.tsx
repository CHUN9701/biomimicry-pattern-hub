"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Category, Variant } from "@/lib/data";

export type SceneLevel = "grid" | "category" | "variant";

type SceneState = {
  level: SceneLevel;
  category: Category | null;
  variant: Variant | null;
};

type SceneContextValue = SceneState & {
  setScene: (next: Partial<SceneState>) => void;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SceneState>({
    level: "grid",
    category: null,
    variant: null,
  });

  const setScene = useCallback((next: Partial<SceneState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo(() => ({ ...state, setScene }), [state, setScene]);

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used within SceneProvider");
  return ctx;
}
