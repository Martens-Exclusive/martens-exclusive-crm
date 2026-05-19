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
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Stock
        </p>
        <h1 className="mt-3 text-2xl font-bold text-black">Stockwagen bewerken</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
          Werk de gegevens van deze stockwagen bij op een aparte pagina, met dezelfde
          logica en stijl als de rest van het CRM.
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
          inventoryType: vehicle.inventoryType,
          commissionType: vehicle.commissionType,
          commissionRate: vehicle.commissionRate,
          commissionFixedExclVatCents: vehicle.commissionFixedExclVatCents,
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