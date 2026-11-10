"use client";

import { useState } from "react";

import type { TimelineData, TimelineItem, TimelineKind } from "@/lib/activity-timeline";

type Filter = "all" | TimelineKind;

const INITIAL_COUNT = 12;

// Kleur en icoon per kanaal. Volledige klassen staan hier vast, zodat Tailwind ze kent.
const contactStyles: Record<string, string> = {
  PHONE_CALL: "border-green-200 bg-green-50 text-green-700",
  EMAIL: "border-blue-200 bg-blue-50 text-blue-700",
  SMS: "border-sky-200 bg-sky-50 text-sky-700",
  WHATSAPP: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SHOWROOM_VISIT: "border-amber-200 bg-amber-50 text-amber-700"
};

const noteStyle = "border-yellow-200 bg-yellow-50 text-yellow-700";

function Icon({ type, kind }: { type: string; kind: TimelineKind }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (kind === "note") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (type === "PHONE_CALL") {
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
      </svg>
    );
  }

  if (type === "EMAIL") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (type === "SHOWROOM_VISIT") {
    return (
      <svg {...common}>
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }

  // Sms en WhatsApp
  return (
    <svg {...common}>
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.3A8.5 8.5 0 1 1 21 12Z" />
    </svg>
  );
}

function ContactItem({ item }: { item: TimelineItem }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-black">{item.title}</p>
        <p className="shrink-0 text-xs font-semibold text-black/55">{item.timeLabel}</p>
      </div>

      {item.details ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-black">{item.details}</p>
      ) : (
        <p className="mt-2 text-sm text-black/40">Geen notitie bij dit contact.</p>
      )}

      {item.userName ? <p className="mt-3 text-xs text-black/45">{item.userName}</p> : null}
    </div>
  );
}

function SystemItem({ item }: { item: TimelineItem }) {
  return (
    <p className="text-xs leading-5 text-black/55">
      <span className="font-semibold text-black/70">{item.title}</span>
      {item.details ? ` · ${item.details}` : ""}
      {` · ${item.timeLabel}`}
      {item.userName ? ` · ${item.userName.split(" ")[0]}` : ""}
    </p>
  );
}

export function ActivityTimeline({ data }: { data: TimelineData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);

  const counts = {
    all: data.items.length,
    contact: data.items.filter((item) => item.kind === "contact").length,
    note: data.items.filter((item) => item.kind === "note").length,
    system: data.items.filter((item) => item.kind === "system").length
  };

  const filtered = data.items.filter((item) => filter === "all" || item.kind === filter);
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  const chips: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "Alles" },
    { value: "contact", label: "Contact" },
    { value: "note", label: "Notities" },
    { value: "system", label: "Systeem" }
  ];

  // Groeperen per dag, in dezelfde volgorde als de lijst.
  const groups: Array<{ day: string; items: TimelineItem[] }> = [];

  for (const item of visible) {
    const last = groups[groups.length - 1];

    if (last && last.day === item.dayLabel) {
      last.items.push(item);
    } else {
      groups.push({ day: item.dayLabel, items: [item] });
    }
  }

  return (
    <div className="rounded-[28px] border border-black/10 bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8">
      <h2 className="text-xl font-bold text-black">Contact en activiteiten</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/45">Laatste contact</p>
          {data.lastContact ? (
            <p className="mt-2 text-sm font-semibold text-black">
              {data.lastContact.channel} · {data.lastContact.agoLabel}
              <span className="font-normal text-black/50"> ({data.lastContact.dateLabel})</span>
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-amber-700">Nog geen contact geregistreerd</p>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/45">Contactmomenten</p>
          <p className="mt-2 text-sm font-semibold text-black">{data.contactCount} geregistreerd</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => {
              setFilter(chip.value);
              setShowAll(false);
            }}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === chip.value
                ? "border-black bg-black text-white"
                : "border-black/15 bg-raised text-black hover:bg-hover2"
            }`}
          >
            {chip.label} ({counts[chip.value]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/12 bg-hover p-4 text-sm text-black/55">
          Niets gevonden voor deze keuze.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.day}>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-black/45">
                {group.day}
              </p>

              <ol className="flex flex-col">
                {group.items.map((item, index) => {
                  const isLast = index === group.items.length - 1;
                  const isMajor = item.kind !== "system";
                  const tone =
                    item.kind === "contact"
                      ? (contactStyles[item.type] ?? contactStyles.PHONE_CALL)
                      : noteStyle;

                  return (
                    <li key={item.id} className={`relative pl-12 ${isLast ? "" : "pb-4"}`}>
                      {!isLast ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-[15px] top-8 bottom-0 w-px bg-black/10"
                        />
                      ) : null}

                      {isMajor ? (
                        <span
                          className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border ${tone}`}
                        >
                          <Icon type={item.type} kind={item.kind} />
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="absolute left-[11px] top-1.5 h-2.5 w-2.5 rounded-full border border-black/25 bg-white"
                        />
                      )}

                      {isMajor ? <ContactItem item={item} /> : <SystemItem item={item} />}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}

          {!showAll && filtered.length > INITIAL_COUNT ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="self-start rounded-xl border border-black/15 bg-raised px-4 py-2 text-xs font-semibold text-black transition hover:bg-hover2"
            >
              Toon alles ({filtered.length})
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
