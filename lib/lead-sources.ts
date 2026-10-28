import { prisma } from "@/lib/prisma";

// Bronnen die altijd beschikbaar moeten zijn in de keuzelijst van een lead.
// Ontbreekt er één in de database, dan wordt ze hier automatisch aangemaakt.
const requiredLeadSources = ["Views", "Reeds klant"];

export async function ensureLeadSources() {
  try {
    for (const name of requiredLeadSources) {
      const existing = await prisma.leadSource.findUnique({
        where: { name },
        select: { id: true }
      });

      if (!existing) {
        await prisma.leadSource.create({ data: { name } });
      }
    }
  } catch {
    // Bv. twee pagina's die tegelijk laden: de bron bestaat dan al. Geen reden om de pagina te blokkeren.
  }
}
