"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-signal text-base hover:bg-signal/90 disabled:bg-signal/40 disabled:text-base/60",
  secondary:
    "bg-surface-raised text-ink border border-border hover:border-signal/50 disabled:opacity-40",
  danger:
    "bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20 disabled:opacity-40",
};

export default function Button({
  variant = "secondary",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
