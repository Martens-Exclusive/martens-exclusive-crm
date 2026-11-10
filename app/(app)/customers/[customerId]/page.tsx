import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { buildTimeline } from "@/lib/activity-timeline";
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
import { ActivityTimeline } from "../../leads/[leadId]/activity-timeline";
import { FicheActions, type FichePanel } from "../../leads/[leadId]/fiche-actions";
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

  // Alle contactmomenten en activiteiten van de leads van deze klant, samen in één tijdlijn.
  const activities = await prisma.activity.findMany({
    where: { lead: { customerId } },
    orderBy: { occurredAt: "desc" },
    take: 80,
    select: {
      id: true,
      type: true,
      summary: true,
      details: true,
      occurredAt: true,
      user: { select: { firstName: true, lastName: true } },
      lead: {
        select: {
          interestedBrand: true,
          interestedModel: true,
          primaryVehicle: { select: { brand: true, model: true } }
        }
      }
    }
  });

  const timeline = buildTimeline(
    activities.map((activity) => {
      const lead = activity.lead;
      const label = lead
        ? lead.primaryVehicle
          ? [lead.primaryVehicle.brand, lead.primaryVehicle.model].filter(Boolean).join(" ")
          : [lead.interestedBrand, lead.interestedModel].filter(Boolean).join(" ")
        : "";

      return { ...activity, leadLabel: customer.leads.length > 1 ? label || "Lead zonder wagen" : null };
    }),
    new Date()
  );

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

  const formValues = {
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
  };

  const panels: FichePanel[] = [
    {
      key: "edit",
      label: "Gegevens wijzigen",
      primary: true,
      node: <CustomerForm customer={formValues} />
    }
  ];

  if (canDelete) {
    panels.push({
      key: "delete",
      label: "Verwijderen",
      node: (
        <div>
          <h2 className="text-xl font-bold text-black">Klant verwijderen</h2>
          <p className="mt-2 mb-5 text-sm leading-6 text-black/70">
            Verwijdert deze klant volledig uit het klantenbestand. Dit kan enkel zolang er geen leads of
            storage-contracten aan gekoppeld zijn.
          </p>
          <DeleteCustomerButton customerId={customer.id} />
        </div>
      )
    });
  }

  const buttonClass =
    "inline-flex items-center rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-hover";

  const extraButtons = (
    <>
      {customer.phone ? (
        <a href={`tel:${customer.phoneKey ?? customer.phone}`} className={buttonClass}>
          Bellen
        </a>
      ) : null}
      {customer.email ? (
        <a href={`mailto:${customer.email}`} className={buttonClass}>
          E-mail sturen
        </a>
      ) : null}
      {customer.email ? (
        <form action={setMailingOptOut}>
          <input type="hidden" name="customerId" value={customer.id} />
          <input type="hidden" name="optOut" value={customer.mailingOptOut ? "0" : "1"} />
          <button type="submit" className={buttonClass}>
            {customer.mailingOptOut ? "Opnieuw inschrijven voor mailings" : "Uitschrijven voor mailings"}
          </button>
        </form>
      ) : null}
    </>
  );

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

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
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
          <Info label="Laatste contact">
            {timeline.lastContact ? (
              <>
                {timeline.lastContact.channel} · {timeline.lastContact.agoLabel}
                <span className="block font-normal text-black/55">{timeline.contactCount} contactmomenten geregistreerd</span>
              </>
            ) : (
              <span className="text-amber-700">Nog geen contact geregistreerd</span>
            )}
          </Info>
        </dl>

        <FicheActions panels={panels} extra={extraButtons} />
      </section>

      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
        <div className="contents xl:flex xl:flex-col xl:gap-6">
          <div className="order-1 xl:order-none">
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
          </div>

          {activities.length > 0 ? (
            <div className="order-4 xl:order-none">
              <ActivityTimeline data={timeline} title="Contact en activiteiten" />
            </div>
          ) : null}
        </div>

        <div className="contents xl:flex xl:flex-col xl:gap-6">
          <div className="order-2 xl:order-none">
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
          </div>

          <div className="order-3 xl:order-none">
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

          <div className="order-5 xl:order-none">
            <Card title="Gegevens en notities">
              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Info label="Taal">{getCustomerLanguageLabel(customer.language)}</Info>
                <Info label="Verjaardag">{customer.birthday ? formatCustomerDate(customer.birthday) : "—"}</Info>
                {customer.vatNumber ? <Info label="Btw-nummer">{customer.vatNumber}</Info> : null}
                <Info label="In het klantenbestand sinds">{dateFormatter.format(customer.createdAt)}</Info>
              </dl>

              {customer.notes ? (
                <p className="mt-5 whitespace-pre-line rounded-2xl bg-white p-4 text-sm leading-6 text-black/75">{customer.notes}</p>
              ) : (
                <p className="mt-5 text-sm text-black/55">Geen notities. Voeg ze toe via Gegevens wijzigen.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
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
