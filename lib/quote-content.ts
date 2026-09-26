// Statische teksten en veldlijsten voor offertes & bestelbonnen, overgenomen
// uit de referentie-implementatie (https://claude.ai/artifact/QPs4hpAuCF5odwjjPpcmh5).

export const DOC_CHECKLIST = [
  { key: "docKeys", label: "Alle sleutels" },
  { key: "docMaintenanceBooklet", label: "Onderhoudsboekje" },
  { key: "docCarPass", label: "Car-pass" },
  { key: "docRegistration", label: "Inschrijvingsbewijs" },
  { key: "docCoc", label: "COC-attest" },
  { key: "docWarranty", label: "Garantiebewijs" }
] as const;

export type DocChecklistKey = (typeof DOC_CHECKLIST)[number]["key"];

export const VEHICLE_SPECS = [
  { key: "chassisNumber", label: "Chassisnummer", placeholder: "" },
  { key: "mileage", label: "Kilometerstand", placeholder: "67.528 km" },
  { key: "firstRegistration", label: "1ste inschrijving", placeholder: "20/03/2017" },
  { key: "fuelType", label: "Brandstof", placeholder: "" },
  { key: "transmission", label: "Transmissie", placeholder: "" },
  { key: "displacement", label: "Cilinderinhoud", placeholder: "3.800 cc" },
  { key: "power", label: "Vermogen", placeholder: "580 pk / 427 kW" },
  { key: "co2", label: "CO₂", placeholder: "216 g/km" },
  { key: "euroNorm", label: "Euronorm", placeholder: "" },
  { key: "warranty", label: "Garantie", placeholder: "" },
  { key: "exterior", label: "Exterieur", placeholder: "" },
  { key: "interior", label: "Interieur", placeholder: "" }
] as const;

export const FINANCING_CLAUSE =
  "Financiering: Verkoop onder voorbehoud van financiering. De koper bezorgt binnen 5 werkdagen een schriftelijk bewijs van goedkeuring of weigering. Zonder aangetekende weigering binnen die termijn is de verkoop definitief.";

export const DEFAULT_CLOSING_TEXT =
  "Deze offerte is vrijblijvend en geldig tot de vermelde datum, onder voorbehoud van tussentijdse verkoop. Heeft u nog vragen of wilt u de wagen graag zien of rijden? Laat het mij gerust weten, dan plannen we een moment in de showroom.";

export const ORDER_ACCEPTANCE_TEXT =
  "Het voertuig wordt verkocht in de staat waarin het zich bevindt, zoals bezichtigd en goed gekend door de koper. De koper aanvaardt de algemene verkoop- en waarborgvoorwaarden in bijlage. Opgemaakt in tweevoud te Lennik op {datum}.";

export const COMPANY_FOOTER =
  "MARTENS EXCLUSIVE BV · Assesteenweg 122/3, 1750 Sint-Kwintens-Lennik · BTW BE 0707.682.405 · RPR Brussel · KBC BE26 7340 7840 7129 (KREDBEBB) · Belfius BE78 0689 4014 9386 (GKCCBEBB) · info@martens-exclusive.be · +32 484 28 85 48 · martens-exclusive.be";

export const QUOTE_TYPE_LABELS: Record<string, string> = {
  OFFERTE: "Offerte",
  BESTELBON: "Bestelbon"
};
