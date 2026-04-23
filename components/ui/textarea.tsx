import { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none",
        "placeholder:text-black/40",
        "focus:border-black focus:ring-1 focus:ring-black/20",
        className
      )}
    />
  );
}