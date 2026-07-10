type Tone = "idle" | "live" | "warn" | "danger";

interface StatusPillProps {
  label: string;
  tone?: Tone;
}

const toneClasses: Record<Tone, { dot: string; text: string }> = {
  idle: { dot: "bg-muted", text: "text-muted" },
  live: { dot: "bg-signal animate-pulse-dot", text: "text-signal" },
  warn: { dot: "bg-warn animate-pulse-dot", text: "text-warn" },
  danger: { dot: "bg-danger", text: "text-danger" },
};

export default function StatusPill({ label, tone = "idle" }: StatusPillProps) {
  const classes = toneClasses[tone];

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${classes.dot}`} />
      <span className={`text-xs font-medium tracking-wide ${classes.text}`}>
        {label}
      </span>
    </div>
  );
}
