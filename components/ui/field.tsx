import type { PropsWithChildren } from "react";

type FieldProps = PropsWithChildren<{
  label: string;
  hint?: string;
}>;

export function Field({ children, hint, label }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-brand-graphite">{label}</span>
      {children}
      {hint ? <span className="text-xs text-brand-graphite/55">{hint}</span> : null}
    </label>
  );
}
