import destinationsJson from "@/data/destinations.json";
import routesJson from "@/data/routes.json";
import pricingJson from "@/data/pricing.json";
import activitiesJson from "@/data/activities.json";
import type { TripInput } from "@/lib/schemas/itinerary";

export interface DestinationRecord {
  slug: string;
  name: string;
  region: string;
  description: string;
}

export interface RouteRecord {
  origin: string;
  destination: string;
  mode: string;
  operatorName: string | null;
  durationMinutes: number;
  costMin: number;
  costMax: number;
  scheduleNotes: string | null;
  verified: boolean;
  lastVerifiedDate: string;
}

export interface PricingRecord {
  destination: string;
  itemName: string;
  category: string;
  localPriceMin: number;
  localPriceMax: number;
  touristPriceMin: number;
  touristPriceMax: number;
  note: string;
  lastVerifiedDate: string;
}

export interface ActivityRecord {
  destination: string;
  name: string;
  category: string;
  durationMinutes: number;
  costBudget: number;
  costMidRange: number;
  costFlexible: number;
  interests: string[];
}

let usePrisma = false;

export function setUsePrisma(value: boolean) {
  usePrisma = value;
}

export async function getDestinations(): Promise<DestinationRecord[]> {
  if (usePrisma) {
    try {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.destination.findMany({ orderBy: { name: "asc" } });
      return rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        region: r.region,
        description: r.description ?? "",
      }));
    } catch {
      // fall through to JSON
    }
  }
  return destinationsJson as DestinationRecord[];
}

export async function getSupportedDestinationNames(): Promise<string[]> {
  const dests = await getDestinations();
  return dests.map((d) => d.name);
}

export async function resolveDestinationSlug(nameOrSlug: string): Promise<string | null> {
  const dests = await getDestinations();
  const normalized = nameOrSlug.toLowerCase().trim();
  const bySlug = dests.find((d) => d.slug === normalized);
  if (bySlug) return bySlug.slug;
  const byName = dests.find((d) => d.name.toLowerCase() === normalized);
  return byName?.slug ?? null;
}

export async function validateDestinations(names: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const name of names) {
    const slug = await resolveDestinationSlug(name);
    if (slug) {
      const dests = await getDestinations();
      const dest = dests.find((d) => d.slug === slug);
      if (dest) valid.push(dest.name);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

export async function getRoutes(): Promise<RouteRecord[]> {
  if (usePrisma) {
    try {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.route.findMany({
        include: { origin: true, destination: true },
      });
      return rows.map((r) => ({
        origin: r.origin.slug,
        destination: r.destination.slug,
        mode: r.mode,
        operatorName: r.operatorName,
        durationMinutes: r.durationMinutes,
        costMin: r.costMin,
        costMax: r.costMax,
        scheduleNotes: r.scheduleNotes,
        verified: r.verified,
        lastVerifiedDate: r.lastVerifiedDate.toISOString().split("T")[0],
      }));
    } catch {
      // fall through
    }
  }
  return routesJson as RouteRecord[];
}

export async function getRoutesBetween(
  originSlug: string,
  destinationSlug: string
): Promise<RouteRecord[]> {
  const all = await getRoutes();
  return all.filter(
    (r) => r.origin === originSlug && r.destination === destinationSlug
  );
}

export async function getPricingEntries(
  destinationSlugs: string[]
): Promise<PricingRecord[]> {
  if (usePrisma) {
    try {
      const { prisma } = await import("@/lib/db");
      const dests = await prisma.destination.findMany({
        where: { slug: { in: destinationSlugs } },
      });
      const ids = dests.map((d) => d.id);
      const rows = await prisma.pricingEntry.findMany({
        where: { destinationId: { in: ids } },
        include: { destination: true },
      });
      return rows.map((r) => ({
        destination: r.destination.slug,
        itemName: r.itemName,
        category: r.category,
        localPriceMin: r.localPriceMin,
        localPriceMax: r.localPriceMax,
        touristPriceMin: r.touristPriceMin,
        touristPriceMax: r.touristPriceMax,
        note: r.note ?? "",
        lastVerifiedDate: r.lastVerifiedDate.toISOString().split("T")[0],
      }));
    } catch {
      // fall through
    }
  }
  return (pricingJson as PricingRecord[]).filter((p) =>
    destinationSlugs.includes(p.destination)
  );
}

export async function getActivities(
  destinationSlugs: string[]
): Promise<ActivityRecord[]> {
  if (usePrisma) {
    try {
      const { prisma } = await import("@/lib/db");
      const dests = await prisma.destination.findMany({
        where: { slug: { in: destinationSlugs } },
      });
      const ids = dests.map((d) => d.id);
      const rows = await prisma.activityTemplate.findMany({
        where: { destinationId: { in: ids } },
        include: { destination: true },
      });
      return rows.map((r) => ({
        destination: r.destination.slug,
        name: r.name,
        category: r.category,
        durationMinutes: r.durationMinutes,
        costBudget: r.costBudget,
        costMidRange: r.costMidRange,
        costFlexible: r.costFlexible,
        interests: r.interests,
      }));
    } catch {
      // fall through
    }
  }
  return (activitiesJson as ActivityRecord[]).filter((a) =>
    destinationSlugs.includes(a.destination)
  );
}

export async function buildDatasetContext(input: TripInput): Promise<string> {
  const slugs: string[] = [];
  for (const dest of input.destinations) {
    const slug = await resolveDestinationSlug(dest);
    if (slug) slugs.push(slug);
  }

  const activities = await getActivities(slugs);
  const routes = await getRoutes();
  const relevantRoutes = routes.filter(
    (r) => slugs.includes(r.origin) || slugs.includes(r.destination)
  );

  return JSON.stringify(
    {
      destinations: slugs,
      activities,
      routes: relevantRoutes,
      budget_range: input.budget_range,
      group_type: input.group_type,
      interests: input.interests,
    },
    null,
    2
  );
}
