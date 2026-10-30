import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { leadStatusLabels, type LeadStatus } from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";
import { QUOTE_TYPE_LABELS } from "@/lib/quote-content";
import {
  formatCustomerDate,
  getCustomerFlags,
  getCustomerLanguageLabel,
  getCustomerName,
  getCustomerTypeLabel
} from "@/lib/customers";
import { dateToInput, formatStorageDate, getPlanLabel } from "@/lib/storage";
import { setMailingOptOut } from "../actions";
import { Badge } from "../badge";
import { CustomerForm } from "../customer-form";
import { DeleteCustomerButton } from "../delete-customer-button";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeZone: "Europe/Brussels" });

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      leads: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          interestedBrand: true,
          interestedModel: true,
          storageInterest: true,
          source: { select: { name: true } },
          primaryVehicle: { select: { brand: true, model: true, variant: true } },
          quotes: {
            orderBy: { date: "desc" },
            select: { id: true, type: true, date: true, vehicleTitle: true }
          }
        }
      },
      storageContracts: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, plan: true, vehicleLabel: true, startDate: true, endedAt: true }
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const flags = getCustomerFlags(customer);
  const name = getCustomerName(customer);
  const quotes = customer.leads.flatMap((lead) => lead.quotes.map((quote) => ({ ...quote, leadId: lead.id })));
  const address = [
    [customer.street, customer.houseNumber].filter(Boolean).join(" "),
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
    customer.country && customer.country !== "België" ? customer.country : ""
  ]
    .filter(Boolean)
    .join(", ");
  const canDelete = customer.leads.length === 0 && customer.storageContracts.length === 0;

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">Klantfiche</p>
            <h1 className="mt-3 text-3xl font-bold text-black">{name}</h1>
            {customer.companyName && name !== customer.companyName ? (
              <p className="mt-1 text-sm font-semibold text-black/70">{customer.companyName}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="dark">{getCustomerTypeLabel(customer.type)}</Badge>
              {flags.isBuyer ? <Badge tone="good">Koper</Badge> : null}
              {flags.hasOpenLead ? <Badge tone="warn">Lopende lead</Badge> : null}
              {flags.hasActiveStorage ? <Badge tone="neutral">Car Storage</Badge> : null}
              {!flags.hasActiveStorage && flags.storageInterest ? <Badge tone="neutral">Interesse storage</Badge> : null}
              {customer.mailingOptOut ? <Badge tone="bad">Uitgeschreven</Badge> : null}
            </div>
          </div>
          <Link
            href={"/customers" as Route}
            className="text-sm font-semibold text-black/70 underline underline-offset-4 hover:text-black"
          >
            ← Terug naar het klantenbestand
          </Link>
        </div>

        <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Info label="E-mail">
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                {customer.email}
              </a>
            ) : (
              "—"
            )}
            {customer.email2 ? <span className="block break-all text-black/55">{customer.email2}</span> : null}
          </Info>
          <Info label="Telefoon">
            {customer.phone ? (
              <a href={`tel:${customer.phoneKey ?? customer.phone}`} className="hover:underline">
                {customer.phone}
              </a>
            ) : (
              "—"
            )}
            {customer.phone2 ? <span className="block text-black/55">{customer.phone2}</span> : null}
          </Info>
          <Info label="Adres">{address || "—"}</Info>
          <Info label="Taal · verjaardag">
            {getCustomerLanguageLabel(customer.language)}
            {customer.birthday ? ` · ${formatCustomerDate(customer.birthday)}` : ""}
          </Info>
          {customer.vatNumber ? <Info label="Btw-nummer">{customer.vatNumber}</Info> : null}
          <Info label="In het klantenbestand sinds">{dateFormatter.format(customer.createdAt)}</Info>
        </dl>

        {customer.email ? (
          <form action={setMailingOptOut} className="mt-6">
            <input type="hidden" name="customerId" value={customer.id} />
            <input type="hidden" name="optOut" value={customer.mailingOptOut ? "0" : "1"} />
            <button
              type="submit"
              className="rounded-2xl border border-black/15 bg-raised px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-hover2 hover:text-black"
            >
              {customer.mailingOptOut ? "Opnieuw inschrijven voor mailings" : "Uitschrijven voor mailings"}
            </button>
          </form>
        ) : null}

        {customer.notes ? (
          <p className="mt-6 whitespace-pre-line rounded-2xl bg-white p-4 text-sm leading-6 text-black/75">{customer.notes}</p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card title={`Leads (${customer.leads.length})`}>
          {customer.leads.length === 0 ? (
            <Empty>Nog geen leads voor deze klant.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {customer.leads.map((lead) => {
                const vehicle = lead.primaryVehicle
                  ? [lead.primaryVehicle.brand, lead.primaryVehicle.model, lead.primaryVehicle.variant].filter(Boolean).join(" ")
                  : [lead.interestedBrand, lead.interestedModel].filter(Boolean).join(" ");

                return (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}` as Route}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-hover2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-black">{vehicle || "Geen wagen of interesse ingevuld"}</p>
                        <p className="mt-0.5 text-xs text-black/50">
                          {dateFormatter.format(lead.createdAt)} · {lead.source.name}
                        </p>
                      </div>
                      <LeadStatusPill status={lead.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title={`Offertes en bestelbonnen (${quotes.length})`}>
            {quotes.length === 0 ? (
              <Empty>Nog geen offertes of bestelbonnen.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {quotes.map((quote) => (
                  <li key={quote.id}>
                    <Link
                      href={`/leads/${quote.leadId}/quotes/${quote.id}` as Route}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-hover2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-black">{quote.vehicleTitle || "Wagen niet ingevuld"}</p>
                        <p className="mt-0.5 text-xs text-black/50">{dateFormatter.format(quote.date)}</p>
                      </div>
                      <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-black/75">
                        {QUOTE_TYPE_LABELS[quote.type] ?? quote.type}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Car Storage (${customer.storageContracts.length})`}>
            {customer.storageContracts.length === 0 ? (
              <Empty>Geen storage-contract.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {customer.storageContracts.map((contract) => (
                  <li key={contract.id}>
                    <Link
                      href={`/storage/${contract.id}` as Route}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-hover2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-black">{contract.vehicleLabel || "Wagen niet ingevuld"}</p>
                        <p className="mt-0.5 text-xs text-black/50">
                          {getPlanLabel(contract.plan)}
                          {contract.startDate ? ` · sinds ${formatStorageDate(contract.startDate)}` : ""}
                          {contract.status === "ENDED" && contract.endedAt
                            ? ` · beëindigd op ${formatStorageDate(contract.endedAt)}`
                            : ""}
                        </p>
                      </div>
                      <Badge tone={contract.status === "ACTIVE" ? "good" : "neutral"}>
                        {contract.status === "ACTIVE" ? "Actief" : "Beëindigd"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-lg font-bold text-black">Gegevens wijzigen</h2>
        <CustomerForm
          customer={{
            id: customer.id,
            type: customer.type,
            firstName: customer.firstName ?? "",
            lastName: customer.lastName ?? "",
            companyName: customer.companyName ?? "",
            vatNumber: customer.vatNumber ?? "",
            email: customer.email ?? "",
            email2: customer.email2 ?? "",
            phone: customer.phone ?? "",
            phone2: customer.phone2 ?? "",
            street: customer.street ?? "",
            houseNumber: customer.houseNumber ?? "",
            postalCode: customer.postalCode ?? "",
            city: customer.city ?? "",
            country: customer.country ?? "",
            language: customer.language,
            birthday: dateToInput(customer.birthday),
            mailingOptOut: customer.mailingOptOut,
            notes: customer.notes ?? ""
          }}
        />
      </section>

      {canDelete ? (
        <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-black">Verwijderen</h2>
          <p className="mt-1 mb-4 max-w-xl text-sm leading-6 text-black/65">
            Verwijdert deze klant volledig uit het klantenbestand. Enkel mogelijk zolang er geen leads of
            storage-contracten aan gekoppeld zijn.
          </p>
          <DeleteCustomerButton customerId={customer.id} />
        </section>
      ) : null}
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <h2 className="mb-4 text-lg font-bold text-black">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-black/55">{children}</p>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">{label}</dt>
      <dd className="mt-1.5 font-semibold text-black">{children}</dd>
    </div>
  );
}

function LeadStatusPill({ status }: { status: string }) {
  const label = leadStatusLabels[status as LeadStatus] ?? status;
  const tone = status === "WON" ? "good" : status === "LOST" ? "bad" : "warn";
  return <Badge tone={tone}>{label}</Badge>;
}
