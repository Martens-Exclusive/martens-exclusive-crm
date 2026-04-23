import { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none",
        "focus:border-black focus:ring-1 focus:ring-black/20",
        className
      )}
    >
      {children}
    </select>
  );
}