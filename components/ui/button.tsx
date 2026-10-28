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
          "border border-black/15 bg-white text-black hover:bg-hover3 disabled:border-black/10 disabled:bg-black/5 disabled:text-black/40",

        // SECONDARY → donker
        variant === "secondary" &&
          "border border-black/10 bg-black text-white hover:bg-black/80",

        // GHOST
        variant === "ghost" &&
          "text-black/70 hover:bg-black/5 hover:text-black",

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}