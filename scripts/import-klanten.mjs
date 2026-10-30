// Eenmalige import van het klantenbestand in de CRM.
//
// 1. Zet de opgekuiste Excel-lijst (exports/klanten-excel.json) om naar klantfiches.
// 2. Koppelt alle bestaande leads en storage-contracten aan hun klant (op e-mail of telefoon),
//    of maakt een klantfiche aan als die persoon nog niet bestaat.
//
// Gebruik:  node scripts/import-klanten.mjs --dry-run   (toont wat er zou gebeuren, wijzigt niets)
//           node scripts/import-klanten.mjs             (voert de import uit)
//
// Alles gebeurt in één transactie: lukt één stap niet, dan wordt er niets opgeslagen.
// Opnieuw draaien is veilig: bestaande klanten worden herkend en enkel aangevuld.
// De normalisatie hieronder volgt exact lib/customers.ts (dit script draait buiten Next.js).
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

class DryRunRollback extends Error {}

function normalizeEmail(value) {
  const email = (value ?? "").trim().toLowerCase();
  return email || null;
}

function normalizePhoneKey(value) {
  let digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("32") && digits.length >= 10) digits = `0${digits.slice(2).replace(/^0/, "")}`;
  if (!digits.startsWith("0") && digits.length === 9) digits = `0${digits}`;
  return digits.length >= 9 ? digits : null;
}

function formatPhone(value) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const key = normalizePhoneKey(raw);
  if (!key || /^(\+|00)(?!32)/.test(raw)) return raw;
  if (/^04\d{8}$/.test(key)) return `${key.slice(0, 4)} ${key.slice(4, 6)} ${key.slice(6, 8)} ${key.slice(8)}`;
  if (/^0[2349]\d{7}$/.test(key)) return `${key.slice(0, 2)} ${key.slice(2, 5)} ${key.slice(5, 7)} ${key.slice(7)}`;
  if (/^0[1-9]\d{7}$/.test(key)) return `${key.slice(0, 3)} ${key.slice(3, 5)} ${key.slice(5, 7)} ${key.slice(7)}`;
  return raw;
}

function normalizeVatNumber(value) {
  const cleaned = (value ?? "").toUpperCase().replace(/^BTW/, "").replace(/[^A-Z0-9]/g, "");
  return cleaned || null;
}

const text = (value) => (typeof value === "string" ? value.trim() : "") || null;

async function findMatch(tx, { emails, phones, firstName, lastName }) {
  const emailList = emails.map(normalizeEmail).filter(Boolean);
  const phoneList = phones.map(normalizePhoneKey).filter(Boolean);

  if (emailList.length > 0) {
    const byEmail = await tx.customer.findFirst({
      where: { OR: [{ email: { in: emailList } }, { email2: { in: emailList } }] },
      orderBy: { createdAt: "asc" }
    });
    if (byEmail) return byEmail;
  }

  if (phoneList.length > 0) {
    const byPhone = await tx.customer.findFirst({
      where: { OR: [{ phoneKey: { in: phoneList } }, { phone2Key: { in: phoneList } }] },
      orderBy: { createdAt: "asc" }
    });
    if (byPhone) return byPhone;
  }

  // Enkel voor importrijen zonder e-mail en telefoon: herkennen op volledige naam,
  // zodat een tweede importrun geen dubbels maakt.
  if (emailList.length === 0 && phoneList.length === 0 && firstName && lastName) {
    return tx.customer.findFirst({
      where: {
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
        email: null,
        phoneKey: null
      }
    });
  }

  return null;
}

// Vult enkel lege velden aan; afwijkend e-mailadres of telefoonnummer gaat naar het tweede veld.
function fillBlanks(customer, input, type) {
  const data = {};
  for (const field of ["firstName", "lastName", "companyName", "street", "houseNumber", "postalCode", "city", "notes"]) {
    const incoming = text(input[field]);
    if (incoming && !text(customer[field])) data[field] = incoming;
  }

  const vat = normalizeVatNumber(input.vatNumber);
  if (vat && !customer.vatNumber) data.vatNumber = vat;
  if (input.birthday && !customer.birthday) data.birthday = new Date(`${input.birthday}T00:00:00.000Z`);

  const known = { email: customer.email, email2: customer.email2, phoneKey: customer.phoneKey, phone2Key: customer.phone2Key };

  for (const raw of [input.email, input.email2]) {
    const email = normalizeEmail(raw);
    if (!email || email === known.email || email === known.email2) continue;
    if (!known.email) known.email = data.email = email;
    else if (!known.email2) known.email2 = data.email2 = email;
  }

  for (const raw of [input.phone, input.phone2]) {
    const key = normalizePhoneKey(raw);
    if (!key || key === known.phoneKey || key === known.phone2Key) continue;
    if (!known.phoneKey) {
      known.phoneKey = data.phoneKey = key;
      data.phone = formatPhone(raw);
    } else if (!known.phone2Key) {
      known.phone2Key = data.phone2Key = key;
      data.phone2 = formatPhone(raw);
    }
  }

  if (type === "CUSTOMER" && customer.type !== "CUSTOMER") data.type = "CUSTOMER";
  return data;
}

async function upsertCustomer(tx, input, type, stats) {
  const existing = await findMatch(tx, {
    emails: [input.email, input.email2],
    phones: [input.phone, input.phone2],
    firstName: text(input.firstName),
    lastName: text(input.lastName)
  });

  if (existing) {
    const data = fillBlanks(existing, input, type);
    if (Object.keys(data).length > 0) {
      await tx.customer.update({ where: { id: existing.id }, data });
      stats.updated += 1;
    } else {
      stats.unchanged += 1;
    }
    return existing.id;
  }

  const email = normalizeEmail(input.email);
  const email2 = normalizeEmail(input.email2);
  const created = await tx.customer.create({
    data: {
      type,
      firstName: text(input.firstName),
      lastName: text(input.lastName),
      companyName: text(input.companyName),
      vatNumber: normalizeVatNumber(input.vatNumber),
      email,
      email2: email2 && email2 !== email ? email2 : null,
      phone: formatPhone(input.phone),
      phoneKey: normalizePhoneKey(input.phone),
      phone2: formatPhone(input.phone2),
      phone2Key: normalizePhoneKey(input.phone2),
      street: text(input.street),
      houseNumber: text(input.houseNumber),
      postalCode: text(input.postalCode),
      city: text(input.city),
      country: text(input.country) ?? "België",
      language: ["NL", "FR", "EN", "DE"].includes(input.language) ? input.language : "NL",
      birthday: input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : null,
      notes: text(input.notes)
    },
    select: { id: true }
  });
  stats.created += 1;
  return created.id;
}

const newStats = () => ({ created: 0, updated: 0, unchanged: 0 });
const excelStats = newStats();
const leadStats = newStats();
const storageStats = newStats();

try {
  const excelRows = JSON.parse(readFileSync("exports/klanten-excel.json", "utf8"));

  await prisma.$transaction(
    async (tx) => {
      // 1. Excel: iedereen in dit bestand is een bestaande klant.
      for (const row of excelRows) {
        await upsertCustomer(tx, row, "CUSTOMER", excelStats);
      }

      // 2. Leads: gewonnen = Klant, anders Prospect. Oudste eerst, zodat de eerste lead de basis vormt.
      const leads = await tx.lead.findMany({ where: { customerId: null }, orderBy: { createdAt: "asc" } });
      for (const lead of leads) {
        const customerId = await upsertCustomer(tx, lead, lead.status === "WON" ? "CUSTOMER" : "PROSPECT", leadStats);
        await tx.lead.update({ where: { id: lead.id }, data: { customerId } });
      }

      // 3. Car Storage: een storageklant is altijd een Klant.
      const contracts = await tx.storageContract.findMany({ where: { customerId: null }, orderBy: { createdAt: "asc" } });
      for (const contract of contracts) {
        const customerId = await upsertCustomer(tx, contract, "CUSTOMER", storageStats);
        await tx.storageContract.update({ where: { id: contract.id }, data: { customerId } });
      }

      const total = await tx.customer.count();
      console.log(`
Excel-lijst (${excelRows.length} rijen): ${excelStats.created} nieuw, ${excelStats.updated} aangevuld, ${excelStats.unchanged} al aanwezig
Leads (${leads.length} nog niet gekoppeld): ${leadStats.created} nieuwe klant, ${leadStats.updated + leadStats.unchanged} gekoppeld aan bestaande klant
Storage-contracten (${contracts.length} nog niet gekoppeld): ${storageStats.created} nieuwe klant, ${storageStats.updated + storageStats.unchanged} gekoppeld aan bestaande klant
Totaal in het klantenbestand: ${total}`);

      if (DRY_RUN) throw new DryRunRollback();
    },
    { maxWait: 20_000, timeout: 300_000 }
  );

  console.log("\nKlaar: de import is opgeslagen.");
} catch (error) {
  if (error instanceof DryRunRollback) {
    console.log("\nProefrun: er is niets opgeslagen. Draai zonder --dry-run om de import uit te voeren.");
  } else {
    console.error("Import mislukt, er is niets opgeslagen:", error);
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
