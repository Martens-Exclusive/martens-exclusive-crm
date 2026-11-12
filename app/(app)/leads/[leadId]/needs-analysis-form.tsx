"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { updateNeedsAnalysis, type UpdateNeedsAnalysisState } from "../actions";
import { useFormShell } from "./fiche-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  NEEDS_FORM_PREFIX,
  NEEDS_OWNERSHIP_OPTIONS,
  NEEDS_TIMELINE_OPTIONS,
  type NeedsAnalysisValues
} from "@/lib/needs-analysis";
import {
  ANNUAL_KM_OPTIONS,
  BLOCKER_OPTIONS,
  BODY_TYPES,
  BRAND_SUGGESTIONS,
  BUDGET_OPTIONS,
  CAR_YEAR_OPTIONS,
  CHARGING_OPTIONS,
  DECISION_OPTIONS,
  ELECTRIC_RANGE_OPTIONS,
  EXTERIOR_COLORS,
  FUEL_TYPES,
  INTERIOR_COLORS,
  LONGEST_TRIP_OPTIONS,
  MAX_MILEAGE_OPTIONS,
  MIN_YEAR_OPTIONS,
  MODEL_CATALOG,
  NOGO_OPTIONS,
  OPTION_SUGGESTIONS,
  PASSENGER_OPTIONS,
  PAYMENT_OPTIONS,
  QUALITY_OPTIONS,
  REASON_OPTIONS,
  TRIP_TYPES,
  VARIANT_OPTIONS,
  type Candidate,
  type NeedsProfile
} from "@/lib/needs-profile";

type NeedsAnalysisFormProps = {
  leadId: string;
  values: NeedsAnalysisValues;
  profile: NeedsProfile;
};

const initialState: UpdateNeedsAnalysisState = {};

const name = (key: keyof NeedsAnalysisValues) => `${NEEDS_FORM_PREFIX}${key}`;

function Section({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={`needs-step-${number}`} className="scroll-mt-16 border-t border-black/10 pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
          {number}
        </span>
        <h3 className="text-base font-bold text-black">{title}</h3>
      </div>
      {hint ? <p className="mt-1 pl-9 text-xs text-black/55">{hint}</p> : null}
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-black">{children}</p>
      {hint ? <p className="mt-0.5 text-xs text-black/50">{hint}</p> : null}
    </div>
  );
}

const chipBase = "rounded-xl border px-3 py-1.5 text-xs font-semibold transition";

function ChipGroup({
  options,
  selected,
  onChange,
  tone = "dark"
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  tone?: "dark" | "negative";
}) {
  const activeClass = tone === "negative" ? "border-red-300 bg-red-100 text-red-800" : "border-black bg-black text-white";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
            className={`${chipBase} ${active ? activeClass : "border-black/15 bg-raised text-black hover:bg-hover2"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// Een optie kan "moet erop" (zwart), "zou leuk zijn" (grijs met rand) of niet belangrijk zijn. Elke klik schuift een stap door.
function OptionPicker({
  must,
  nice,
  onChange
}: {
  must: string[];
  nice: string[];
  onChange: (must: string[], nice: string[]) => void;
}) {
  function cycle(option: string) {
    if (must.includes(option)) {
      onChange(must.filter((item) => item !== option), [...nice, option]);
    } else if (nice.includes(option)) {
      onChange(must, nice.filter((item) => item !== option));
    } else {
      onChange([...must, option], nice);
    }
  }

  // Eigen opties die niet in de lijst staan, blijven zichtbaar.
  const all = [...OPTION_SUGGESTIONS, ...[...must, ...nice].filter((item) => !OPTION_SUGGESTIONS.includes(item))];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((option) => {
          const state = must.includes(option) ? "must" : nice.includes(option) ? "nice" : "none";

          return (
            <button
              key={option}
              type="button"
              onClick={() => cycle(option)}
              className={`${chipBase} ${
                state === "must"
                  ? "border-black bg-black text-white"
                  : state === "nice"
                    ? "border-black/40 bg-hover3 text-black"
                    : "border-black/15 bg-raised text-black/70 hover:bg-hover2"
              }`}
            >
              {state === "must" ? "● " : state === "nice" ? "○ " : ""}
              {option}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-black/50">
        Tik één keer voor “moet erop” (●), twee keer voor “zou leuk zijn” (○), drie keer om te wissen.
      </p>
    </div>
  );
}

// Eén keuze uit een lijst; tik nogmaals om te wissen.
function SingleChips({
  options,
  value,
  onChange
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={`${chipBase} ${active ? "border-black bg-black text-white" : "border-black/15 bg-raised text-black hover:bg-hover2"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const toOptions = (items: string[]) => items.map((item) => ({ value: item, label: item }));

// Vrije lijst met items: typ iets en druk op Enter of komma.
function TagInput({
  values,
  onChange,
  placeholder
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const items = draft
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length > 0) {
      onChange(Array.from(new Set([...values, ...items])));
    }

    setDraft("");
  }

  return (
    <div>
      {values.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-hover3 px-3 py-1.5 text-xs font-semibold text-black"
            >
              {item}
              <button
                type="button"
                aria-label={`${item} verwijderen`}
                onClick={() => onChange(values.filter((value) => value !== item))}
                className="text-black/50 hover:text-black"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

// Kies merk en model door aan te tikken; typen hoeft enkel voor iets dat niet in de lijst staat.
function CarPicker({
  brand,
  model,
  onChange,
  idPrefix
}: {
  brand: string;
  model: string;
  onChange: (brand: string, model: string) => void;
  idPrefix: string;
}) {
  const models = MODEL_CATALOG[brand] ?? [];
  const otherBrand = brand !== "" && !BRAND_SUGGESTIONS.includes(brand);
  const [otherModel, setOtherModel] = useState(model !== "" && !models.includes(model));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {BRAND_SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={brand === item}
            onClick={() => {
              setOtherModel(false);
              onChange(brand === item ? "" : item, "");
            }}
            className={`${chipBase} ${brand === item ? "border-black bg-black text-white" : "border-black/15 bg-raised text-black hover:bg-hover2"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {otherBrand || brand === "" ? (
        <Input
          id={`${idPrefix}-brand`}
          placeholder="Ander merk? Typ het hier"
          value={otherBrand ? brand : ""}
          onChange={(event) => onChange(event.target.value, model)}
        />
      ) : null}

      {models.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {models.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={model === item}
              onClick={() => {
                setOtherModel(false);
                onChange(brand, model === item ? "" : item);
              }}
              className={`${chipBase} ${model === item ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:bg-hover"}`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOtherModel(true)}
            className={`${chipBase} border-dashed ${otherModel ? "border-black bg-hover3 text-black" : "border-black/30 bg-transparent text-black/60 hover:bg-hover2"}`}
          >
            Ander model
          </button>
        </div>
      ) : null}

      {brand && (models.length === 0 || otherModel) ? (
        <Input
          placeholder="Model (bv. X5)"
          value={models.includes(model) ? "" : model}
          onChange={(event) => onChange(brand, event.target.value)}
        />
      ) : null}
    </div>
  );
}

function CandidateRows({
  candidates,
  onChange
}: {
  candidates: Candidate[];
  onChange: (next: Candidate[]) => void;
}) {
  function update(index: number, patch: Partial<Candidate>) {
    onChange(candidates.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      {candidates.map((row, index) => (
        <div key={index} className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/45">
              {index === 0 ? "Eerste keuze" : `Keuze ${index + 1}`}
            </p>
            <button
              type="button"
              onClick={() => onChange(candidates.filter((_, rowIndex) => rowIndex !== index))}
              className="rounded-lg border border-black/15 bg-raised px-2.5 py-1 text-xs font-semibold text-black/70 transition hover:bg-hover2"
            >
              Verwijder
            </button>
          </div>

          <CarPicker
            idPrefix={`cand-${index}`}
            brand={row.brand}
            model={row.model}
            onChange={(brand, model) => update(index, { brand, model })}
          />

          <p className="mb-1.5 mt-3 text-xs font-semibold text-black/55">Uitvoering</p>
          <SingleChips
            options={toOptions(VARIANT_OPTIONS)}
            value={row.variant}
            onChange={(next) => update(index, { variant: next })}
          />
          <Input
            className="mt-2"
            placeholder="Of typ een exacte uitvoering (optioneel)"
            value={VARIANT_OPTIONS.includes(row.variant) ? "" : row.variant}
            onChange={(event) => update(index, { variant: event.target.value })}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...candidates, { brand: "", model: "", variant: "", note: "" }])}
        className="w-fit rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-hover"
      >
        {candidates.length === 0 ? "+ Merk en model toevoegen" : "+ Nog een model (twijfelt hij tussen meerdere?)"}
      </button>
    </div>
  );
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

// Optioneel extra veld: ingeklapt achter een knop, zodat je niet hoeft te typen.
function ExtraNote({
  label,
  name: fieldName,
  defaultValue,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(defaultValue.length > 0);

  return open ? (
    <FieldBlock label={label}>
      <Textarea name={fieldName} rows={2} defaultValue={defaultValue} placeholder={placeholder} maxLength={2000} />
    </FieldBlock>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-fit rounded-xl border border-dashed border-black/30 px-3 py-1.5 text-xs font-semibold text-black/60 transition hover:bg-hover2"
    >
      + {label}
    </button>
  );
}

// De behoefteanalyse in de volgorde van het gesprek. Bijna alles is aan te tikken, alles is optioneel
// en wijzigingen worden automatisch bewaard terwijl je met de klant praat.
export function NeedsAnalysisForm({ leadId, values, profile: initialProfile }: NeedsAnalysisFormProps) {
  const [state, formAction, isPending] = useActionState(updateNeedsAnalysis, initialState);
  const [autoState, autoAction] = useActionState(updateNeedsAnalysis, initialState);
  const [, startAutosave] = useTransition();
  const shellClass = useFormShell(state);
  const formRef = useRef<HTMLFormElement>(null);

  const [profile, setProfile] = useState<NeedsProfile>(initialProfile);
  const [ownership, setOwnership] = useState(values.ownership);
  const [timeline, setTimeline] = useState(values.timeline);
  const [textRevision, setTextRevision] = useState(0);
  const [saveLabel, setSaveLabel] = useState("");

  const set = <K extends keyof NeedsProfile>(key: K, value: NeedsProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const profileJson = useMemo(() => JSON.stringify(profile), [profile]);
  const showRange =
    profile.fuelTypes.length === 0 ||
    profile.fuelTypes.some((fuel) => fuel.startsWith("Hybride (plug") || fuel === "Elektrisch");

  // Snelle sprongen naar een onderdeel; een vinkje betekent dat daar al iets is aangeduid.
  const steps = [
    { number: 1, label: "Huidige wagen", done: profile.reasons.length > 0 || Boolean(profile.currentBrand) },
    {
      number: 2,
      label: "Gebruik",
      done: Boolean(profile.annualKm || profile.longestTrip || profile.minElectricRange) || profile.tripTypes.length > 0 || profile.passengers.length > 0
    },
    {
      number: 3,
      label: "Wagen",
      done:
        profile.bodyTypes.length > 0 ||
        profile.fuelTypes.length > 0 ||
        profile.exteriorColors.length > 0 ||
        profile.noGoColors.length > 0 ||
        profile.interiorColors.length > 0
    },
    { number: 4, label: "Modellen", done: profile.candidates.length > 0 },
    {
      number: 5,
      label: "Opties",
      done: profile.optionsMust.length > 0 || profile.optionsNice.length > 0 || profile.noGoTags.length > 0
    },
    {
      number: 6,
      label: "Budget",
      done: Boolean(profile.budgetMax || profile.maxMileage || profile.minYear || ownership) || profile.payment.length > 0
    },
    { number: 7, label: "Timing", done: Boolean(timeline) || profile.decisionTags.length > 0 || profile.blockers.length > 0 }
  ];

  // Automatisch bewaren, kort nadat je iets aantikt of typt. Niet bij het openen van het paneel.
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setSaveLabel("Wijzigingen worden bewaard...");

    const timer = setTimeout(() => {
      if (!formRef.current) return;

      const data = new FormData(formRef.current);
      data.set("autosave", "1");
      startAutosave(() => autoAction(data));
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileJson, ownership, timeline, textRevision]);

  useEffect(() => {
    if (autoState.success) setSaveLabel("Automatisch bewaard");
    else if (autoState.message) setSaveLabel("Bewaren mislukt, tik op opslaan");
  }, [autoState]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={() => setTextRevision((value) => value + 1)}
      className={`flex flex-col gap-6 ${shellClass}`}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="needs_profile" value={profileJson} />
      <input type="hidden" name={name("ownership")} value={ownership} />
      <input type="hidden" name={name("timeline")} value={timeline} />

      <nav
        aria-label="Onderdelen van het gesprek"
        className="sticky top-0 z-10 -mx-5 -mt-5 flex gap-1.5 overflow-x-auto border-b border-black/10 bg-card px-5 py-2.5 sm:-mx-6 sm:-mt-6 sm:px-6"
      >
        {steps.map((step) => (
          <button
            key={step.number}
            type="button"
            onClick={() => document.getElementById(`needs-step-${step.number}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              step.done ? "border-black/30 bg-hover3 text-black" : "border-black/15 bg-raised text-black/70 hover:bg-hover2"
            }`}
          >
            {step.done ? "✓ " : `${step.number} `}
            {step.label}
          </button>
        ))}
      </nav>

      <div>
        <h2 className="text-xl font-bold text-black">Behoefteanalyse</h2>
        <p className="mt-1 text-sm text-black/60">
          Tik aan wat de klant zegt. Alles wordt automatisch bewaard, typen hoeft enkel als je iets extra wil noteren.
        </p>
      </div>

      <Section number={1} title="Waarom nu, en wat rijdt hij nu?">
        <FieldBlock label="Waarom een nieuwe wagen?" hint="Meerdere antwoorden mogelijk.">
          <ChipGroup options={REASON_OPTIONS} selected={profile.reasons} onChange={(next) => set("reasons", next)} />
        </FieldBlock>

        <FieldBlock label="Wat rijdt hij nu?">
          <CarPicker
            idPrefix="current"
            brand={profile.currentBrand}
            model={profile.currentModel}
            onChange={(brand, model) => setProfile((current) => ({ ...current, currentBrand: brand, currentModel: model }))}
          />
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Uitvoering (optioneel)"
              value={profile.currentVariant}
              onChange={(event) => set("currentVariant", event.target.value)}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-black/55">Bouwjaar</p>
          <SingleChips
            options={toOptions(CAR_YEAR_OPTIONS)}
            value={profile.currentYear}
            onChange={(next) => set("currentYear", next)}
          />
        </FieldBlock>

        <FieldBlock label="Wat bevalt er goed aan zijn huidige wagen?">
          <ChipGroup options={QUALITY_OPTIONS} selected={profile.likes} onChange={(next) => set("likes", next)} />
        </FieldBlock>

        <FieldBlock label="Wat bevalt er niet?">
          <ChipGroup
            options={QUALITY_OPTIONS}
            selected={profile.dislikes}
            onChange={(next) => set("dislikes", next)}
            tone="negative"
          />
        </FieldBlock>

        <FieldBlock label="Opties van de huidige wagen die hij weer wil" hint="Tik aan, of typ een eigen optie onderaan.">
          <ChipGroup
            options={[...OPTION_SUGGESTIONS, ...profile.keepOptions.filter((item) => !OPTION_SUGGESTIONS.includes(item))]}
            selected={profile.keepOptions}
            onChange={(next) => set("keepOptions", next)}
          />
        </FieldBlock>

        <ExtraNote
          label="Extra notitie over aanleiding of huidige wagen"
          name={name("reasonAndCurrentCar")}
          defaultValue={values.reasonAndCurrentCar}
          placeholder="Alleen als er iets bij hoort dat hierboven niet staat"
        />
      </Section>

      <Section number={2} title="Gebruik en rijbereik">
        <FieldBlock label="Kilometers per jaar">
          <SingleChips options={ANNUAL_KM_OPTIONS} value={profile.annualKm} onChange={(next) => set("annualKm", next)} />
        </FieldBlock>

        <FieldBlock label="Soort ritten">
          <ChipGroup options={TRIP_TYPES} selected={profile.tripTypes} onChange={(next) => set("tripTypes", next)} />
        </FieldBlock>

        <FieldBlock label="Wie rijdt er mee?">
          <ChipGroup options={PASSENGER_OPTIONS} selected={profile.passengers} onChange={(next) => set("passengers", next)} />
        </FieldBlock>

        <FieldBlock label="Langste rit die hij regelmatig doet" hint="Heen en terug.">
          <SingleChips options={LONGEST_TRIP_OPTIONS} value={profile.longestTrip} onChange={(next) => set("longestTrip", next)} />
        </FieldBlock>

        {showRange ? (
          <>
            <FieldBlock label="Wat is een goed elektrisch rijbereik voor hem?" hint="Enkel voor hybride of elektrisch.">
              <SingleChips
                options={ELECTRIC_RANGE_OPTIONS}
                value={profile.minElectricRange}
                onChange={(next) => set("minElectricRange", next)}
              />
            </FieldBlock>

            <FieldBlock label="Kan hij laden?">
              <SingleChips options={CHARGING_OPTIONS} value={profile.charging} onChange={(next) => set("charging", next)} />
            </FieldBlock>
          </>
        ) : null}

        <ExtraNote
          label="Extra notitie over gebruik"
          name={name("usage")}
          defaultValue={values.usage}
          placeholder="Bv. pendelt dagelijks naar Brussel"
        />
      </Section>

      <Section number={3} title="Welke wagen zoekt hij?" hint="Meerdere antwoorden zijn mogelijk.">
        <FieldBlock label="Carrosserie">
          <ChipGroup options={BODY_TYPES} selected={profile.bodyTypes} onChange={(next) => set("bodyTypes", next)} />
        </FieldBlock>

        <FieldBlock label="Aandrijving">
          <ChipGroup options={FUEL_TYPES} selected={profile.fuelTypes} onChange={(next) => set("fuelTypes", next)} />
        </FieldBlock>

        <FieldBlock label="Kleur buiten">
          <ChipGroup options={EXTERIOR_COLORS} selected={profile.exteriorColors} onChange={(next) => set("exteriorColors", next)} />
        </FieldBlock>

        <FieldBlock label="Kleuren die absoluut niet mogen">
          <ChipGroup
            options={EXTERIOR_COLORS}
            selected={profile.noGoColors}
            onChange={(next) => set("noGoColors", next)}
            tone="negative"
          />
        </FieldBlock>

        <FieldBlock label="Kleur interieur">
          <ChipGroup options={INTERIOR_COLORS} selected={profile.interiorColors} onChange={(next) => set("interiorColors", next)} />
        </FieldBlock>
      </Section>

      <Section
        number={4}
        title="Merken en modellen waar hij naar kijkt"
        hint="Twijfelt hij tussen BMW, Mercedes en Audi? Voeg ze allemaal toe."
      >
        <CandidateRows candidates={profile.candidates} onChange={(next) => set("candidates", next)} />
      </Section>

      <Section number={5} title="Opties die belangrijk zijn">
        <OptionPicker
          must={profile.optionsMust}
          nice={profile.optionsNice}
          onChange={(must, nice) => setProfile((current) => ({ ...current, optionsMust: must, optionsNice: nice }))}
        />

        <ExtraNote
          label="Andere opties of wensen"
          name={name("mustHaves")}
          defaultValue={values.mustHaves}
          placeholder="Alles wat niet in de lijst staat"
        />

        <FieldBlock label="Wat mag absoluut niet?">
          <ChipGroup options={NOGO_OPTIONS} selected={profile.noGoTags} onChange={(next) => set("noGoTags", next)} tone="negative" />
        </FieldBlock>

        <ExtraNote label="Andere no-gos" name={name("noGos")} defaultValue={values.noGos} placeholder="Bv. geen sportuitlaat" />
      </Section>

      <Section number={6} title="Budget en grenzen">
        <FieldBlock label="Maximumbudget">
          <SingleChips options={BUDGET_OPTIONS} value={profile.budgetMax} onChange={(next) => set("budgetMax", next)} />
          <Input
            inputMode="numeric"
            className="mt-1"
            value={BUDGET_OPTIONS.some((option) => option.value === profile.budgetMax) ? "" : profile.budgetMax}
            onChange={(event) => set("budgetMax", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="Of typ een exact bedrag (optioneel)"
          />
        </FieldBlock>

        <FieldBlock label="Betaling">
          <ChipGroup options={PAYMENT_OPTIONS} selected={profile.payment} onChange={(next) => set("payment", next)} />
        </FieldBlock>

        <FieldBlock label="Privé of zaak">
          <SingleChips options={NEEDS_OWNERSHIP_OPTIONS as unknown as Array<{ value: string; label: string }>} value={ownership} onChange={setOwnership} />
        </FieldBlock>

        <FieldBlock label="Maximale kilometerstand">
          <SingleChips options={MAX_MILEAGE_OPTIONS} value={profile.maxMileage} onChange={(next) => set("maxMileage", next)} />
        </FieldBlock>

        <FieldBlock label="Bouwjaar">
          <SingleChips options={MIN_YEAR_OPTIONS} value={profile.minYear} onChange={(next) => set("minYear", next)} />
        </FieldBlock>

        <ExtraNote label="Extra notitie over budget" name={name("budget")} defaultValue={values.budget} placeholder="Bv. maandlast rond €1.500" />
      </Section>

      <Section number={7} title="Timing en beslissing">
        <FieldBlock label="Hoe snel moet het gebeuren?">
          <SingleChips
            options={NEEDS_TIMELINE_OPTIONS as unknown as Array<{ value: string; label: string }>}
            value={timeline}
            onChange={setTimeline}
          />
        </FieldBlock>

        <FieldBlock label="Wie beslist mee, en kijkt hij ook elders?">
          <ChipGroup options={DECISION_OPTIONS} selected={profile.decisionTags} onChange={(next) => set("decisionTags", next)} />
        </FieldBlock>

        <FieldBlock label="Wat houdt hem nog tegen om te beslissen?">
          <ChipGroup options={BLOCKER_OPTIONS} selected={profile.blockers} onChange={(next) => set("blockers", next)} />
        </FieldBlock>

        <ExtraNote label="Extra notitie" name={name("notes")} defaultValue={values.notes} placeholder="Alles wat nog niet past" />
        <ExtraNote label="Extra notitie over de beslissing" name={name("decision")} defaultValue={values.decision} placeholder="Bv. kijkt ook bij Porsche Centrum Aalst" />
      </Section>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-3 border-t border-black/10 bg-card px-5 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Opslaan..." : "Opslaan en sluiten"}
        </Button>

        <span className="text-xs font-semibold text-black/50">{saveLabel}</span>

        {state.message && !state.success ? (
          <span className="text-sm font-semibold text-red-700">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
