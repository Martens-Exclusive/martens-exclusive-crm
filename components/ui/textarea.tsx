import clsx from "clsx";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-3xl border border-brand-sand bg-white px-4 py-3 text-sm text-brand-graphite outline-none transition placeholder:text-brand-graphite/35 focus:border-brand-bronze focus:ring-2 focus:ring-brand-bronze/15",
        className
      )}
      {...props}
    />
  );
}
