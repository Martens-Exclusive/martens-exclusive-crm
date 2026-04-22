import type { Route } from "next";

export const mainNavigation: Array<{
  href: Route;
  label: string;
}> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/stock", label: "Stock" },
  { href: "/tasks", label: "Taken" },
  { href: "/appointments", label: "Afspraken" }
];