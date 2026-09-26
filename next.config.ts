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
  // Next.js' file-tracing pikt pdfkit's lettertypebestanden en onze eigen
  // Josefin Sans-lettertypebestanden (offertes/bestelbonnen-PDF) niet automatisch
  // op, waardoor ze ontbraken in de gedeployde serverless functie op Vercel. Dit
  // dwingt Next.js om die bestanden alsnog mee te pakken voor alle API-routes.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/js/**/*", "./fonts/**/*"]
  },
  experimental: {
    serverActions: {
      // Foto's voor offertes worden als base64 meegestuurd naar de server action;
      // de standaardlimiet van 1 MB is te laag voor een verkleinde foto van ~1800px.
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
