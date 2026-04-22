import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition placeholder:text-black/40 focus:border-black focus:ring-2 focus:ring-black/10",
        className
      )}
      {...props}
    />
  );
}