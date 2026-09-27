// Statische teksten en veldlijsten voor offertes & bestelbonnen, overgenomen
// uit de referentie-implementatie (https://claude.ai/artifact/QPs4hpAuCF5odwjjPpcmh5).
//
// Sommige teksten bestaan in drie talen: het document zelf (wat de klant ziet)
// kan in het Nederlands, Frans of Engels opgesteld worden, gekozen per
// offerte/bestelbon. De app zelf (het formulier links in de editor) blijft
// altijd Nederlandstalig.

export type QuoteLanguage = "NL" | "FR" | "EN";

type Localized = { NL: string; FR: string; EN: string };

export const DOC_CHECKLIST = [
  { key: "docKeys", label: { NL: "Alle sleutels", FR: "Toutes les clés", EN: "All keys" } },
  {
    key: "docMaintenanceBooklet",
    label: { NL: "Onderhoudsboekje", FR: "Carnet d'entretien", EN: "Service booklet" }
  },
  { key: "docCarPass", label: { NL: "Car-pass", FR: "Car-Pass", EN: "Car-Pass" } },
  {
    key: "docRegistration",
    label: { NL: "Inschrijvingsbewijs", FR: "Certificat d'immatriculation", EN: "Registration certificate" }
  },
  { key: "docCoc", label: { NL: "COC-attest", FR: "Certificat COC", EN: "COC certificate" } },
  { key: "docWarranty", label: { NL: "Garantiebewijs", FR: "Certificat de garantie", EN: "Warranty certificate" } }
] as const satisfies ReadonlyArray<{ key: string; label: Localized }>;

export type DocChecklistKey = (typeof DOC_CHECKLIST)[number]["key"];

export const VEHICLE_SPECS = [
  {
    key: "chassisNumber",
    label: { NL: "Chassisnummer", FR: "Numéro de châssis", EN: "Chassis number" },
    placeholder: ""
  },
  { key: "mileage", label: { NL: "Kilometerstand", FR: "Kilométrage", EN: "Mileage" }, placeholder: "67.528 km" },
  {
    key: "firstRegistration",
    label: { NL: "1ste inschrijving", FR: "1ère immatriculation", EN: "First registration" },
    placeholder: "20/03/2017"
  },
  { key: "fuelType", label: { NL: "Brandstof", FR: "Carburant", EN: "Fuel type" }, placeholder: "" },
  { key: "transmission", label: { NL: "Transmissie", FR: "Transmission", EN: "Transmission" }, placeholder: "" },
  {
    key: "displacement",
    label: { NL: "Cilinderinhoud", FR: "Cylindrée", EN: "Displacement" },
    placeholder: "3.800 cc"
  },
  { key: "power", label: { NL: "Vermogen", FR: "Puissance", EN: "Power" }, placeholder: "580 pk / 427 kW" },
  { key: "co2", label: { NL: "CO₂", FR: "CO₂", EN: "CO₂" }, placeholder: "216 g/km" },
  { key: "euroNorm", label: { NL: "Euronorm", FR: "Norme Euro", EN: "Euro norm" }, placeholder: "" },
  { key: "warranty", label: { NL: "Garantie", FR: "Garantie", EN: "Warranty" }, placeholder: "" },
  { key: "exterior", label: { NL: "Exterieur", FR: "Extérieur", EN: "Exterior" }, placeholder: "" },
  { key: "interior", label: { NL: "Interieur", FR: "Intérieur", EN: "Interior" }, placeholder: "" }
] as const satisfies ReadonlyArray<{ key: string; label: Localized; placeholder: string }>;

export const FINANCING_CLAUSE: Localized = {
  NL: "Financiering: Verkoop onder voorbehoud van financiering. De koper bezorgt binnen 5 werkdagen een schriftelijk bewijs van goedkeuring of weigering. Zonder aangetekende weigering binnen die termijn is de verkoop definitief.",
  FR: "Financement : vente sous réserve de financement. L'acheteur fournit dans les 5 jours ouvrables une preuve écrite d'accord ou de refus. Sans refus notifié par lettre recommandée dans ce délai, la vente est définitive.",
  EN: "Financing: The sale is subject to financing approval. The buyer will provide written proof of approval or refusal within 5 working days. Without a refusal notified by registered letter within that period, the sale becomes final."
};

export const DEFAULT_CLOSING_TEXT: Localized = {
  NL: "Deze offerte is vrijblijvend en geldig tot de vermelde datum, onder voorbehoud van tussentijdse verkoop. Heeft u nog vragen of wilt u de wagen graag zien of rijden? Laat het mij gerust weten, dan plannen we een moment in de showroom.",
  FR: "Ce devis est sans engagement et valable jusqu'à la date mentionnée, sauf vente entre-temps. Avez-vous encore des questions ou souhaitez-vous voir ou essayer le véhicule ? N'hésitez pas à me le faire savoir, nous planifierons volontiers un moment dans le showroom.",
  EN: "This quotation is without obligation and valid until the date stated, subject to prior sale. If you have any questions or would like to see or test drive the vehicle, please let me know and we will arrange a time at the showroom."
};

export const ORDER_ACCEPTANCE_TEXT: Localized = {
  NL: "Het voertuig wordt verkocht in de staat waarin het zich bevindt, zoals bezichtigd en goed gekend door de koper. De koper aanvaardt de algemene verkoop- en waarborgvoorwaarden in bijlage. Opgemaakt in tweevoud te Lennik op {datum}.",
  FR: "Le véhicule est vendu dans l'état où il se trouve, tel que visité et bien connu de l'acheteur. L'acheteur accepte les conditions générales de vente et de garantie en annexe. Établi en double exemplaire à Lennik, le {datum}.",
  EN: "The vehicle is sold in its current condition, as inspected and well known to the buyer. The buyer accepts the general terms of sale and warranty attached. Drawn up in duplicate in Lennik on {datum}."
};

// Bedrijfs- en bankgegevens zijn eigennamen/nummers en blijven in alle talen ongewijzigd.
export const COMPANY_FOOTER =
  "MARTENS EXCLUSIVE BV · Assesteenweg 122/3, 1750 Sint-Kwintens-Lennik · BTW BE 0707.682.405 · RPR Brussel · KBC BE26 7340 7840 7129 (KREDBEBB) · Belfius BE78 0689 4014 9386 (GKCCBEBB) · info@martens-exclusive.be · +32 484 28 85 48 · martens-exclusive.be";

// Labels in de app zelf (formulier, knoppen, lijsten): blijven altijd Nederlands.
export const QUOTE_TYPE_LABELS: Record<string, string> = {
  OFFERTE: "Offerte",
  BESTELBON: "Bestelbon"
};

// Vaste teksten IN het document (kop, secties, prijzen, ondertekening, ...),
// die wél meegaan met de gekozen documenttaal.
export const DOCUMENT_LABELS: Record<
  QuoteLanguage,
  {
    kind: { OFFERTE: string; BESTELBON: string };
    datum: string;
    geldigTot: string;
    voor: string;
    koper: string;
    naam: string;
    adres: string;
    email: string;
    bedrijf: string;
    btwNummer: string;
    telefoon: string;
    voertuig: string;
    documenten: string;
    fiscaal: string;
    biv: string;
    verkeersbelasting: string;
    perJaar: string;
    fiscaalNote: string;
    opmerkingen: string;
    verkoopprijs: string;
    exclBtw: string;
    inclBtw: string;
    btw: string;
    totaal: string;
    overname: string;
    voorschot: string;
    voorschotBijBestelling: string;
    saldoBijLevering: string;
    saldoNote: string;
    margeregelingNote: string;
    handtekeningVerkoper: string;
    handtekeningKoper: string;
    uitrusting: string;
    fotos: string;
    termsTitle: string;
    termsSubtitle: string;
  }
> = {
  NL: {
    kind: { OFFERTE: "OFFERTE", BESTELBON: "BESTELBON" },
    datum: "DATUM",
    geldigTot: "GELDIG TOT",
    voor: "VOOR",
    koper: "KOPER",
    naam: "Naam",
    adres: "Adres",
    email: "E-mail",
    bedrijf: "Bedrijf",
    btwNummer: "Btw-nummer",
    telefoon: "Telefoon",
    voertuig: "VOERTUIG",
    documenten: "DOCUMENTEN",
    fiscaal: "FISCAAL",
    biv: "BIV",
    verkeersbelasting: "Verkeersbel.",
    perJaar: "jaar",
    fiscaalNote: "Indicatief, niet inbegrepen in de prijs. Afhankelijk van gewest en situatie van de koper.",
    opmerkingen: "OPMERKINGEN",
    verkoopprijs: "Verkoopprijs",
    exclBtw: "excl. btw",
    inclBtw: "incl. btw",
    btw: "Btw",
    totaal: "Totaal",
    overname: "Overname",
    voorschot: "Voorschot",
    voorschotBijBestelling: "Voorschot bij bestelling",
    saldoBijLevering: "TOTAAL TE BETALEN",
    saldoNote: "Volledig te betalen vóór levering van het voertuig.",
    margeregelingNote: "Bijzondere regeling tweedehandse goederen (winstmarge). ",
    handtekeningVerkoper: "HANDTEKENING VERKOPER",
    handtekeningKoper: "HANDTEKENING KOPER — VOOR AKKOORD",
    uitrusting: "UITRUSTING",
    fotos: "FOTO'S",
    termsTitle: "ALGEMENE VERKOOP- EN WAARBORGVOORWAARDEN",
    termsSubtitle: "Verkoopovereenkomst tweedehandsvoertuig"
  },
  FR: {
    kind: { OFFERTE: "DEVIS", BESTELBON: "BON DE COMMANDE" },
    datum: "DATE",
    geldigTot: "VALABLE JUSQU'AU",
    voor: "POUR",
    koper: "ACHETEUR",
    naam: "Nom",
    adres: "Adresse",
    email: "E-mail",
    bedrijf: "Société",
    btwNummer: "Numéro de TVA",
    telefoon: "Téléphone",
    voertuig: "VÉHICULE",
    documenten: "DOCUMENTS",
    fiscaal: "FISCAL",
    biv: "TMC",
    verkeersbelasting: "Taxe de circulation",
    perJaar: "an",
    fiscaalNote: "Indicatif, non compris dans le prix. Dépend de la région et de la situation de l'acheteur.",
    opmerkingen: "REMARQUES",
    verkoopprijs: "Prix de vente",
    exclBtw: "hors TVA",
    inclBtw: "TVA comprise",
    btw: "TVA",
    totaal: "Total",
    overname: "Reprise",
    voorschot: "Acompte",
    voorschotBijBestelling: "Acompte à la commande",
    saldoBijLevering: "TOTAL À PAYER",
    saldoNote: "Intégralement payable avant la livraison du véhicule.",
    margeregelingNote: "Régime particulier des biens d'occasion (marge bénéficiaire). ",
    handtekeningVerkoper: "SIGNATURE VENDEUR",
    handtekeningKoper: "SIGNATURE ACHETEUR — POUR ACCORD",
    uitrusting: "ÉQUIPEMENT",
    fotos: "PHOTOS",
    termsTitle: "CONDITIONS GÉNÉRALES DE VENTE ET DE GARANTIE",
    termsSubtitle: "Contrat de vente de véhicule d'occasion"
  },
  EN: {
    kind: { OFFERTE: "QUOTATION", BESTELBON: "ORDER FORM" },
    datum: "DATE",
    geldigTot: "VALID UNTIL",
    voor: "FOR",
    koper: "BUYER",
    naam: "Name",
    adres: "Address",
    email: "Email",
    bedrijf: "Company",
    btwNummer: "VAT number",
    telefoon: "Phone",
    voertuig: "VEHICLE",
    documenten: "DOCUMENTS",
    fiscaal: "TAXES",
    biv: "Registration tax",
    verkeersbelasting: "Road tax",
    perJaar: "year",
    fiscaalNote: "Indicative, not included in the price. Depends on the region and the buyer's situation.",
    opmerkingen: "REMARKS",
    verkoopprijs: "Sale price",
    exclBtw: "excl. VAT",
    inclBtw: "incl. VAT",
    btw: "VAT",
    totaal: "Total",
    overname: "Trade-in",
    voorschot: "Deposit",
    voorschotBijBestelling: "Deposit on order",
    saldoBijLevering: "TOTAL TO PAY",
    saldoNote: "Payable in full before the vehicle is delivered.",
    margeregelingNote: "Special scheme for second-hand goods (profit margin). ",
    handtekeningVerkoper: "SELLER'S SIGNATURE",
    handtekeningKoper: "BUYER'S SIGNATURE — FOR APPROVAL",
    uitrusting: "EQUIPMENT",
    fotos: "PHOTOS",
    termsTitle: "GENERAL TERMS OF SALE AND WARRANTY",
    termsSubtitle: "Second-hand vehicle sales agreement"
  }
};
