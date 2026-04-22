import clsx from "clsx";
import type { PropsWithChildren, SelectHTMLAttributes } from "react";

type SelectProps = PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>;

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        "w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition focus:border-black focus:ring-2 focus:ring-black/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}