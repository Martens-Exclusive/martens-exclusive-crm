import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  // pdfkit laadt zijn lettertypebestanden dynamisch in (#standard-fonts/Helvetica).
  // Zonder deze regel probeert Next.js pdfkit mee te bundelen voor de serverless
  // functies op Vercel, waardoor die interne verwijzing kapot gaat en de PDF-export
  // met een 500-fout faalt in productie (werkte lokaal wel, want daar staat alles
  // gewoon los op schijf).
  serverExternalPackages: ["pdfkit"],
  // Next.js' file-tracing pikt pdfkit's lettertypebestanden niet automatisch op
  // (ze worden dynamisch ingeladen, niet via een gewone import), waardoor ze
  // ontbraken in de gedeployde serverless functie op Vercel. Dit dwingt Next.js
  // om die bestanden alsnog mee te pakken voor alle API-routes.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/js/**/*"]
  }
};

export default nextConfig;