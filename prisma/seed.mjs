import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@martensexclusive.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: "Martens",
      lastName: "Admin",
      passwordHash,
      role: "ADMIN",
      isActive: true
    },
    create: {
      firstName: "Martens",
      lastName: "Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      isActive: true
    }
  });

  const defaultSources = [
    "Website",
    "Telefoon",
    "WhatsApp",
    "Bezoek showroom",
    "Autoscout24",
    "Mobile.de",
    "Doorverwijzing"
  ];

  for (const sourceName of defaultSources) {
    await prisma.leadSource.upsert({
      where: { name: sourceName },
      update: {},
      create: {
        name: sourceName
      }
    });
  }

  const lostReasons = [
    { label: "Geen reactie", sortOrder: 1 },
    { label: "Kocht elders", sortOrder: 2 },
    { label: "Prijsbezwaar", sortOrder: 3 },
    { label: "Financiering probleem", sortOrder: 4 },
    { label: "Overname probleem", sortOrder: 5 },
    { label: "Wagen niet beschikbaar", sortOrder: 6 }
  ];

  for (const lostReason of lostReasons) {
    await prisma.lostReason.upsert({
      where: { label: lostReason.label },
      update: {
        sortOrder: lostReason.sortOrder
      },
      create: lostReason
    });
  }

  await prisma.vehicle.upsert({
    where: { stockNumber: "MX-001" },
    update: {
      vin: "WVWZZZ1JZ3W000001",
      purchaseDate: new Date("2026-01-14"),
      purchaseVatType: "BTW_WAGEN",
      saleVatType: "BTW_WAGEN",
      purchaseVatRate: 21,
      saleVatRate: 21,
      purchasePriceExclVatCents: 3120000,
      salePriceExclVatCents: 3795000,
      costsExclVatCents: 185000,
      netProfitCents: 490000,
      priceCents: 3795000,
      currency: "EUR",
      status: "AVAILABLE"
    },
    create: {
      stockNumber: "MX-001",
      vin: "WVWZZZ1JZ3W000001",
      purchaseDate: new Date("2026-01-14"),
      brand: "BMW",
      model: "320i",
      variant: "M Sport",
      year: 2022,
      mileageKm: 24500,
      color: "Zwart",
      purchaseVatType: "BTW_WAGEN",
      saleVatType: "BTW_WAGEN",
      purchaseVatRate: 21,
      saleVatRate: 21,
      purchasePriceExclVatCents: 3120000,
      salePriceExclVatCents: 3795000,
      costsExclVatCents: 185000,
      netProfitCents: 490000,
      priceCents: 3795000,
      currency: "EUR",
      status: "AVAILABLE"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
