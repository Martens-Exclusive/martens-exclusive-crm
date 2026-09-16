import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { addVehicleCost, deleteVehicleCost } from "../../actions";
import { VehicleForm } from "../../vehicle-form";

export default async function EditStockVehiclePage({
  params
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      costItems: {
        orderBy: {
          date: "desc"
        }
      }
    }
  });

  if (!vehicle) {
    notFound();
  }

  const totalCostCents = vehicle.costItems.reduce(
    (total, cost) => total + cost.amountCents,
    0
  );

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Stock
        </p>
        <h1 className="mt-3 text-2xl font-bold text-black">Stockwagen bewerken</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
          Werk de gegevens van deze stockwagen bij en beheer alle individuele kosten
          op voertuigniveau.
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
          commissionMinimumExclVatCents: vehicle.commissionMinimumExclVatCents,
          purchaseVatType: vehicle.purchaseVatType,
          saleVatType: vehicle.saleVatType,
          purchaseVatRate: vehicle.purchaseVatRate,
          saleVatRate: vehicle.saleVatRate,
          purchasePriceExclVatCents: vehicle.purchasePriceExclVatCents,
          salePriceExclVatCents: vehicle.salePriceExclVatCents,
          costsExclVatCents: vehicle.costsExclVatCents,
          status: vehicle.status
        }}
        totalCostCents={totalCostCents}
      />

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
              Kosten
            </p>
            <h2 className="mt-3 text-2xl font-bold text-black">
              Kosten per voertuig
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70">
              Voeg individuele kosten toe zoals keuring, opkuis, transport of
              voorbereiding. Het totaal wordt automatisch opgeteld.
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-black px-5 py-4 text-right text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
              Totale kosten
            </p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(totalCostCents)}</p>
          </div>
        </div>

        <form action={addVehicleCost} className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_1fr_auto]">
          <input type="hidden" name="vehicleId" value={vehicle.id} />

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">
              Omschrijving
            </label>
            <Input name="label" required placeholder="Bijv. keuring" className="mt-2" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">
              Bedrag excl. btw
            </label>
            <Input
              name="amount"
              required
              inputMode="decimal"
              placeholder="100"
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">
              Datum
            </label>
            <Input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">
              Nota
            </label>
            <Input name="notes" placeholder="Optioneel" className="mt-2" />
          </div>

          <div className="flex items-end">
            <Button type="submit">Toevoegen</Button>
          </div>
        </form>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-black/10 bg-[#fafafa]">
          {vehicle.costItems.length === 0 ? (
            <div className="p-6 text-sm text-black/60">
              Er zijn nog geen kosten toegevoegd voor deze wagen.
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {vehicle.costItems.map((cost) => (
                <div
                  key={cost.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_160px_160px_auto] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-black">{cost.label}</p>
                    {cost.notes ? (
                      <p className="mt-1 text-sm text-black/55">{cost.notes}</p>
                    ) : null}
                  </div>

                  <p className="text-sm text-black/60">
                    {cost.date.toLocaleDateString("nl-BE")}
                  </p>

                  <p className="font-bold text-black">
                    {formatMoney(cost.amountCents)}
                  </p>

                  <form action={deleteVehicleCost}>
                    <input type="hidden" name="costId" value={cost.id} />
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <button
                      type="submit"
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Verwijderen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function toDateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatMoney(valueCents: number | null | undefined) {
  const value = (valueCents ?? 0) / 100;

  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}