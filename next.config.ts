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
  serverExternalPackages: ["pdfkit"]
};

export default nextConfig;