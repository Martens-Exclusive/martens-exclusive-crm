// Gedeelde weergavelogica voor offertes & bestelbonnen: wordt zowel gebruikt
// door het voorbeeld in de editor (React) als door de PDF-generator (pdfkit),
// zodat beide altijd exact hetzelfde tonen. Overgenomen uit de referentie-
// implementatie (https://claude.ai/artifact/QPs4hpAuCF5odwjjPpcmh5).

import { DOC_CHECKLIST, VEHICLE_SPECS } from "./quote-content";

export type RemarkParagraph = { title: string | null; text: string };

/** "Titel: tekst" per regel → { title, text }. Regels zonder ":" krijgen title=null. */
export function parseRemarks(remarks: string): RemarkParagraph[] {
  return remarks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:]{1,30}):\s*(.*)$/);
      if (match) {
        return { title: match[1], text: match[2] };
      }
      return { title: null, text: line };
    });
}

export type EquipmentEntry =
  | { kind: "category"; label: string }
  | { kind: "item"; label: string };

/** Eén optie per regel; een regel die met # begint is een categorie-kop. */
export function parseEquipment(text: string): EquipmentEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("#")) {
        return { kind: "category" as const, label: line.replace(/^#+\s*/, "").toUpperCase() };
      }
      return { kind: "item" as const, label: line.replace(/^[-•–]\s*/, "") };
    });
}

export type VehicleFields = {
  chassisNumber: string;
  mileage: string;
  firstRegistration: string;
  fuelType: string;
  transmission: string;
  displacement: string;
  power: string;
  co2: string;
  euroNorm: string;
  warranty: string;
  exterior: string;
  interior: string;
};

/** Specificatielabels + waarden; exterieur/interieur enkel als ze ingevuld zijn. */
export function vehicleSpecRows(vehicle: VehicleFields): Array<[string, string]> {
  return VEHICLE_SPECS.filter(
    ({ key }) => vehicle[key as keyof VehicleFields] || !["exterior", "interior"].includes(key)
  ).map(({ key, label }) => [label, vehicle[key as keyof VehicleFields] || ""]);
}

/** Groepeert specificatierijen twee-aan-twee, voor een layout met 4 kolommen. */
export function pairSpecRows(rows: Array<[string, string]>): Array<[string, string, string, string]> {
  const paired: Array<[string, string, string, string]> = [];
  for (let i = 0; i < rows.length; i += 2) {
    const [labelA, valueA] = rows[i];
    const [labelB, valueB] = rows[i + 1] ?? ["", ""];
    paired.push([labelA, valueA, labelB, valueB]);
  }
  return paired;
}

export type DocChecklistFields = {
  docKeys: boolean;
  docMaintenanceBooklet: boolean;
  docCarPass: boolean;
  docRegistration: boolean;
  docCoc: boolean;
  docWarranty: boolean;
};

export function documentChecklistRows(
  fields: DocChecklistFields
): Array<{ label: string; checked: boolean }> {
  return DOC_CHECKLIST.map(({ key, label }) => ({
    label,
    checked: Boolean(fields[key as keyof DocChecklistFields])
  }));
}
