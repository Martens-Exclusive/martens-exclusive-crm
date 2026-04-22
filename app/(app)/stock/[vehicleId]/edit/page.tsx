import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { VehicleForm } from "../../vehicle-form";

export default async function EditStockVehiclePage({
  params
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId }
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          Stock
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">Stockwagen bewerken</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
          Werk de gegevens van deze stockwagen bij op een aparte pagina, met dezelfde logica en stijl als de rest van het CRM.
        </p>
      </section>

      <VehicleForm
        vehicle={{
          id: vehicle.id,
          stockNumber: vehicle.stockNumber,
          purchaseDate: toDateInputValue(vehicle.purchaseDate),
          brand: vehicle.brand,
          model: vehicle.model,
          vin: vehicle.vin ?? "",
          mileageKm: vehicle.mileageKm,
          purchaseVatType: vehicle.purchaseVatType,
          saleVatType: vehicle.saleVatType,
          purchaseVatRate: vehicle.purchaseVatRate,
          saleVatRate: vehicle.saleVatRate,
          purchasePriceExclVatCents: vehicle.purchasePriceExclVatCents,
          salePriceExclVatCents: vehicle.salePriceExclVatCents,
          costsExclVatCents: vehicle.costsExclVatCents,
          status: vehicle.status
        }}
      />
    </main>
  );
}

function toDateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}
