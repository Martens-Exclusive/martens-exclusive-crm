import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { dateToInput, formatBar, formatStorageDate, normalizePlan } from "@/lib/storage";
import { setStorageStatus } from "../actions";
import { DeleteStorageButton } from "../delete-storage-button";
import { StorageForm } from "../storage-form";

export default async function EditStorageContractPage({
  params
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const contract = await prisma.storageContract.findUnique({ where: { id: contractId } });

  if (!contract) {
    notFound();
  }

  const isEnded = contract.status === "ENDED";

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">Car Storage</p>
        <h1 className="mt-3 text-2xl font-bold text-black">
          {contract.firstName} {contract.lastName}
        </h1>
        <p className="mt-2 text-sm text-black/65">
          {contract.vehicleLabel || "Wagen niet ingevuld"}
          {isEnded ? ` · Contract beëindigd op ${formatStorageDate(contract.endedAt) || "—"}` : ""}
        </p>
        <Link
          href={"/storage" as Route}
          className="mt-4 inline-block text-sm font-semibold text-black/70 underline underline-offset-4 hover:text-black"
        >
          ← Terug naar het overzicht
        </Link>
      </section>

      <StorageForm
        contract={{
          id: contract.id,
          firstName: contract.firstName,
          lastName: contract.lastName,
          phone: contract.phone ?? "",
          email: contract.email ?? "",
          isPresent: contract.isPresent,
          plan: normalizePlan(contract.plan),
          monthlyPrice: String(contract.monthlyPriceCents / 100),
          billingPeriod: contract.billingPeriod,
          nextInvoiceAt: dateToInput(contract.nextInvoiceAt),
          vehicleLabel: contract.vehicleLabel ?? "",
          chassisNumber: contract.chassisNumber ?? "",
          spot: contract.spot ?? "",
          startDate: dateToInput(contract.startDate),
          batteryCheckedAt: dateToInput(contract.batteryCheckedAt),
          tiresCheckedAt: dateToInput(contract.tiresCheckedAt),
          tirePressureFront: formatBar(contract.tirePressureFrontBar),
          tirePressureRear: formatBar(contract.tirePressureRearBar),
          notes: contract.notes ?? ""
        }}
      />

      <section className="flex flex-wrap items-start gap-6 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="max-w-md">
          <h2 className="text-lg font-bold text-black">
            {isEnded ? "Contract opnieuw activeren" : "Contract beëindigen"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-black/65">
            {isEnded
              ? "De klant komt terug in de actieve lijst en telt weer mee voor de bezetting en de maandomzet."
              : "De klant verdwijnt uit de actieve lijst en telt niet meer mee voor de bezetting en de maandomzet. De gegevens blijven bewaard onder 'Beëindigd'."}
          </p>
          <form action={setStorageStatus} className="mt-4">
            <input type="hidden" name="contractId" value={contract.id} />
            <input type="hidden" name="status" value={isEnded ? "ACTIVE" : "ENDED"} />
            <button
              type="submit"
              className="rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7] hover:text-black"
            >
              {isEnded ? "Opnieuw activeren" : "Contract beëindigen"}
            </button>
          </form>
        </div>

        {isEnded ? (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-black">Verwijderen</h2>
            <p className="mt-1 mb-4 text-sm leading-6 text-black/65">
              Verwijdert deze klant en wagen volledig uit de lijst.
            </p>
            <DeleteStorageButton contractId={contract.id} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
