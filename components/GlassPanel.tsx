import { HTMLAttributes } from "react";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  glow?: boolean;
};

export default function GlassPanel({ className = "", glow = false, children, ...rest }: GlassPanelProps) {
  return (
    <div
      className={`glass-panel ${glow ? "glass-panel-glow" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
