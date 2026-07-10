interface SessionCodeDisplayProps {
  code: string;
}

export default function SessionCodeDisplay({ code }: SessionCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium uppercase tracking-code text-muted">
        Session Code
      </span>
      <span className="font-mono text-4xl font-semibold tracking-code text-ink sm:text-5xl">
        {code}
      </span>
    </div>
  );
}
