import { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-black">
        {label}
      </span>

      {children}

      {hint ? (
        <span className="text-xs text-black/50">
          {hint}
        </span>
      ) : null}
    </label>
  );
}