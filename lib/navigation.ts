import type { Route } from "next";

export const mainNavigation: Array<{
  href: Route;
  label: string;
  // Menu-item blijft actief op alle pagina's die met dit pad beginnen.
  activePrefix?: string;
}> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads/pipeline", label: "Leads", activePrefix: "/leads" },
  { href: "/customers", label: "Klanten" },
  { href: "/stock", label: "Stock" },
  { href: "/storage", label: "Car Storage" },
  { href: "/tasks", label: "Taken" },
  { href: "/appointments", label: "Afspraken" },
  { href: "/platforms", label: "Platformen" }
];