import clsx from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors duration-200",

        // PRIMARY → lichte knop, donkere tekst
        variant === "primary" &&
          "border border-white/20 bg-white text-[#1a1a1a] hover:bg-[#d8d8d8] disabled:border-white/10 disabled:bg-white/20 disabled:text-white/40",

        // SECONDARY → donker
        variant === "secondary" &&
          "border border-white/15 bg-[#1a1a1a] text-white hover:bg-[#242424]",

        // GHOST
        variant === "ghost" &&
          "text-white/70 hover:bg-white/5 hover:text-white",

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}