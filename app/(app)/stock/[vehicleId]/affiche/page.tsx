import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

// Prijs zoals hij bij de klant getoond wordt: incl. btw bij een btw-wagen,
// zonder extra btw bij een margewagen.
function consumerPriceEuro(vehicle: {
  salePriceExclVatCents: number | null;
  saleVatType: string | null;
  saleVatRate: number | null;
}): string {
  if (vehicle.salePriceExclVatCents === null) return "";
  const excl = vehicle.salePriceExclVatCents / 100;
  const factor = vehicle.saleVatType === "BTW_WAGEN" ? 1 + (vehicle.saleVatRate ?? 21) / 100 : 1;
  return String(Math.round(excl * factor));
}

function formatKm(value: number | null): string {
  if (value === null) return "";
  return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} km`;
}

export default async function PosterPage({
  params
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

  if (!vehicle) {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">Stock</p>
        <h1 className="mt-3 text-2xl font-bold text-black">
          Prijsaffiche — {vehicle.brand} {vehicle.model}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
          Vul de gegevens aan en download de A4-affiche voor de showroom. Wat al in de stock
          staat is vooraf ingevuld. De grijze voorbeeldtekst toont het formaat.
        </p>
        <Link
          href={`/stock/${vehicle.id}/edit` as Route}
          className="mt-4 inline-block text-sm font-semibold text-black/70 underline underline-offset-4 hover:text-black"
        >
          ← Terug naar de wagen
        </Link>
      </section>

      <form
        method="post"
        action={`/api/stock/${vehicle.id}/poster`}
        target="_blank"
        className="flex flex-col gap-8 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
      >
        <div>
          <h2 className="text-lg font-bold text-black">Titel en prijs</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PosterField label="Wagen">
              <Input name="title" defaultValue={`${vehicle.brand} ${vehicle.model}`} placeholder="Mercedes-Benz C200d" />
            </PosterField>
            <PosterField label="Uitvoering">
              <Input name="subtitle" defaultValue={vehicle.variant ?? ""} placeholder="Business Line" />
            </PosterField>
            <PosterField label="Prijs (incl. btw, in euro)">
              <Input name="price" inputMode="decimal" defaultValue={consumerPriceEuro(vehicle)} placeholder="25995" />
            </PosterField>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-black">Gegevens</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PosterField label="1e inschrijving">
              <Input name="firstRegistration" defaultValue={vehicle.year ? String(vehicle.year) : ""} placeholder="09/2022" />
            </PosterField>
            <PosterField label="Kilometerstand">
              <Input name="mileage" defaultValue={formatKm(vehicle.mileageKm)} placeholder="65.658 km" />
            </PosterField>
            <PosterField label="Brandstof">
              <Input name="fuel" defaultValue={vehicle.fuelType ?? ""} placeholder="Diesel" />
            </PosterField>
            <PosterField label="Vermogen">
              <Input name="power" placeholder="120 kW (163pk)" />
            </PosterField>
            <PosterField label="Cilinderinhoud">
              <Input name="displacement" placeholder="1993 cc" />
            </PosterField>
            <PosterField label="Transmissie">
              <Input name="transmission" defaultValue={vehicle.transmission ?? ""} placeholder="Automaat" />
            </PosterField>
            <PosterField label="Garantie">
              <Input name="warranty" defaultValue="12 maanden" placeholder="12 maanden" />
            </PosterField>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-black">Milieu en verbruik</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <PosterField label="Brandstofverbruik">
              <Input name="consumption" placeholder="4,8 l/100km" />
            </PosterField>
            <PosterField label="Verbruik, toelichting">
              <Input name="consumptionNote" defaultValue="(Gecombineerd)" placeholder="(Gecombineerd)" />
            </PosterField>
            <PosterField label="CO2-emissie">
              <Input name="co2" placeholder="125 g/km" />
            </PosterField>
            <PosterField label="Emissieklasse">
              <Input name="euroNorm" placeholder="Euro 6" />
            </PosterField>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-black">Opties en accessoires</h2>
          <p className="mt-1 text-xs text-black/50">
            Plak de volledige optielijst, gescheiden door komma&apos;s of per lijn. Bij een lange
            lijst wordt het lettertype automatisch kleiner zodat alles op de affiche past.
          </p>
          <Textarea
            name="options"
            rows={8}
            className="mt-3"
            placeholder="Bv. Digitale radio-ontvangst, Elektrisch verstelbare buitenspiegels, Apple CarPlay, Cruise control, Lederen stuurwiel, Parkeerhulp voor en achter, ..."
          />
        </div>

        <div>
          <h2 className="text-lg font-bold text-black">QR-codes en nummer</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PosterField label="Link advertentie (grote QR)">
              <Input name="adUrl" placeholder="https://martens-exclusive.be/..." />
            </PosterField>
            <PosterField label="Link Car-Pass (kleine QR)">
              <Input name="carPassUrl" placeholder="https://www.car-pass.be/..." />
            </PosterField>
            <PosterField label="Advertentienummer">
              <Input name="adNumber" defaultValue={vehicle.stockNumber} placeholder="078" />
            </PosterField>
          </div>
          <p className="mt-2 text-xs text-black/50">
            Laat een link leeg als je die QR-code niet op de affiche wil.
          </p>
        </div>

        <div>
          <button
            type="submit"
            className="rounded-2xl border border-black/15 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Affiche maken (PDF)
          </button>
        </div>
      </form>
    </main>
  );
}

function PosterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">{label}</span>
      {children}
    </label>
  );
}
