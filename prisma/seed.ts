import { PrismaClient, TransportMode } from "@prisma/client";
import destinations from "../data/destinations.json";
import routes from "../data/routes.json";
import pricing from "../data/pricing.json";
import activities from "../data/activities.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Tara, Pinas! dataset...");

  await prisma.activityTemplate.deleteMany();
  await prisma.pricingEntry.deleteMany();
  await prisma.route.deleteMany();
  await prisma.destination.deleteMany();

  const destinationMap = new Map<string, string>();

  for (const dest of destinations) {
    const created = await prisma.destination.create({
      data: {
        slug: dest.slug,
        name: dest.name,
        region: dest.region,
        description: dest.description,
      },
    });
    destinationMap.set(dest.slug, created.id);
  }

  for (const route of routes) {
    const originId = destinationMap.get(route.origin);
    const destinationId = destinationMap.get(route.destination);
    if (!originId || !destinationId) {
      console.warn(`Skipping route ${route.origin} -> ${route.destination}: missing destination`);
      continue;
    }

    await prisma.route.create({
      data: {
        originId,
        destinationId,
        mode: route.mode as TransportMode,
        operatorName: route.operatorName,
        durationMinutes: route.durationMinutes,
        costMin: route.costMin,
        costMax: route.costMax,
        scheduleNotes: route.scheduleNotes,
        verified: route.verified,
        lastVerifiedDate: new Date(route.lastVerifiedDate),
      },
    });
  }

  for (const entry of pricing) {
    const destinationId = destinationMap.get(entry.destination);
    if (!destinationId) continue;

    await prisma.pricingEntry.create({
      data: {
        destinationId,
        itemName: entry.itemName,
        category: entry.category,
        localPriceMin: entry.localPriceMin,
        localPriceMax: entry.localPriceMax,
        touristPriceMin: entry.touristPriceMin,
        touristPriceMax: entry.touristPriceMax,
        note: entry.note,
        lastVerifiedDate: new Date(entry.lastVerifiedDate),
      },
    });
  }

  for (const activity of activities) {
    const destinationId = destinationMap.get(activity.destination);
    if (!destinationId) continue;

    await prisma.activityTemplate.create({
      data: {
        destinationId,
        name: activity.name,
        category: activity.category,
        durationMinutes: activity.durationMinutes,
        costBudget: activity.costBudget,
        costMidRange: activity.costMidRange,
        costFlexible: activity.costFlexible,
        interests: activity.interests,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
