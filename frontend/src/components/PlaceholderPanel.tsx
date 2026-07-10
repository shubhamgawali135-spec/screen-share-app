import { ReactNode } from "react";

interface PlaceholderPanelProps {
  label: string;
  hint?: string;
  icon?: ReactNode;
  aspect?: "square" | "video";
}

export default function PlaceholderPanel({
  label,
  hint,
  icon,
  aspect = "video",
}: PlaceholderPanelProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-center ${
        aspect === "square" ? "aspect-square" : "aspect-video"
      }`}
    >
      {icon}
      <p className="text-sm font-medium text-muted">{label}</p>
      {hint && <p className="max-w-xs text-xs text-muted/70">{hint}</p>}
    </div>
  );
}
