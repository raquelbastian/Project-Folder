import type { ActivityRecord } from "@/lib/db/dataset";
import {
  chainTransportLegs,
  computeBufferMinutes,
  distributeDestinationsAcrossDays,
} from "@/lib/transport/chain";
import type { RouteRecord } from "@/lib/db/dataset";
import type {
  Activity,
  ItineraryDay,
  ItineraryOutput,
  TripInput,
} from "@/lib/schemas/itinerary";
import { addDays, daysBetween } from "@/lib/utils";
import { buildPricingGuide } from "@/lib/pricing/guide";
import type { PricingRecord } from "@/lib/db/dataset";

function getActivityCost(
  activity: ActivityRecord,
  budgetRange: TripInput["budget_range"]
): number {
  switch (budgetRange) {
    case "budget":
      return activity.costBudget;
    case "mid-range":
      return activity.costMidRange;
    case "flexible":
      return activity.costFlexible;
  }
}

export function resolveAiActivitySelection(
  activity: { name: string; description?: string; duration_minutes?: number; category?: string },
  destinationSlug: string,
  activities: ActivityRecord[],
  budgetRange: TripInput["budget_range"]
): Activity {
  const pool = activities.filter((a) => a.destination === destinationSlug);

  const exact = pool.find((a) => a.name.toLowerCase() === activity.name.toLowerCase());
  if (exact) {
    return {
      name: exact.name,
      description: activity.description ?? `${exact.category} experience in ${destinationSlug.replace(/-/g, " ")}`,
      duration_minutes: activity.duration_minutes ?? exact.durationMinutes,
      cost_estimate: getActivityCost(exact, budgetRange),
      category: exact.category,
    };
  }

  const byCategory = pool.find((a) =>
    activity.category ? a.category.toLowerCase() === activity.category.toLowerCase() : false
  );
  if (byCategory) {
    return {
      name: byCategory.name,
      description: activity.description ?? `${byCategory.category} experience in ${destinationSlug.replace(/-/g, " ")}`,
      duration_minutes: activity.duration_minutes ?? byCategory.durationMinutes,
      cost_estimate: getActivityCost(byCategory, budgetRange),
      category: byCategory.category,
    };
  }

  const fallback = pool[0];
  return {
    name: fallback?.name ?? activity.name,
    description: activity.description ?? `${fallback?.category ?? "local"} experience in ${destinationSlug.replace(/-/g, " ")}`,
    duration_minutes: activity.duration_minutes ?? fallback?.durationMinutes ?? 120,
    cost_estimate: fallback ? getActivityCost(fallback, budgetRange) : 0,
    category: fallback?.category ?? activity.category ?? "local",
  };
}

function selectActivitiesForDay(
  destinationSlug: string,
  activities: ActivityRecord[],
  budgetRange: TripInput["budget_range"],
  interests: string[],
  maxActivities: number
): Activity[] {
  let pool = activities.filter((a) => a.destination === destinationSlug);

  if (interests.length > 0) {
    const scored = pool.map((a) => ({
      activity: a,
      score: a.interests.filter((i) => interests.includes(i)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    pool = scored.map((s) => s.activity);
  }

  const maxDuration = budgetRange === "flexible" ? 720 : budgetRange === "mid-range" ? 540 : 420;
  const selected: Activity[] = [];
  let totalDuration = 0;

  for (const act of pool) {
    if (selected.length >= maxActivities) break;
    if (totalDuration + act.durationMinutes > maxDuration) continue;
    selected.push({
      name: act.name,
      description: `${act.category} experience in ${destinationSlug.replace(/-/g, " ")}`,
      duration_minutes: act.durationMinutes,
      cost_estimate: getActivityCost(act, budgetRange),
      category: act.category,
    });
    totalDuration += act.durationMinutes;
  }

  if (selected.length === 0 && pool.length > 0) {
    const fallback = pool[0];
    selected.push({
      name: fallback.name,
      description: `${fallback.category} experience`,
      duration_minutes: fallback.durationMinutes,
      cost_estimate: getActivityCost(fallback, budgetRange),
      category: fallback.category,
    });
  }

  return selected;
}

export interface BuildItineraryParams {
  input: TripInput;
  destinationSlugs: string[];
  destinationNames: Map<string, string>;
  routes: RouteRecord[];
  activities: ActivityRecord[];
  pricingRecords: PricingRecord[];
  aiActivities?: Record<number, Activity[]>;
}

export function buildItineraryFromDataset(
  params: BuildItineraryParams
): ItineraryOutput {
  const { input, destinationSlugs, destinationNames, routes, activities, pricingRecords } =
    params;
  const numDays = daysBetween(input.start_date, input.end_date);
  const daySchedule = distributeDestinationsAcrossDays(destinationSlugs, numDays);
  const bufferMinutes = computeBufferMinutes(input.group_type);
  const maxActivities = input.group_type === "family" || input.group_type === "barkada" ? 2 : 3;

  const days: ItineraryDay[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < numDays; i++) {
    const date = addDays(input.start_date, i);
    const slug = daySchedule[i];
    const destName = destinationNames.get(slug) ?? slug;

    const aiPlanForDay = params.aiActivities?.[i + 1];

    const dayActivities = aiPlanForDay
      ? aiPlanForDay.map((act) =>
          resolveAiActivitySelection(act, slug, activities, input.budget_range)
        )
      : selectActivitiesForDay(
          slug,
          activities,
          input.budget_range,
          input.interests ?? [],
          maxActivities
        );

    let transportLegs: ItineraryDay["transport_legs"] = [];

    if (i === 0 && destinationSlugs.length > 0) {
      const hubSlug = "metro-manila";
      if (slug !== hubSlug) {
        const { legs, warnings: transportWarnings } = chainTransportLegs({
          stopSlugs: [hubSlug, slug],
          startDate: date,
          budgetRange: input.budget_range,
          routes,
        });
        transportLegs = legs.map((leg) => ({
          ...leg,
          origin: destinationNames.get(leg.origin) ?? leg.origin,
          destination: destinationNames.get(leg.destination) ?? leg.destination,
        }));
        warnings.push(...transportWarnings);
      }
    } else if (i > 0 && daySchedule[i] !== daySchedule[i - 1]) {
      const { legs, warnings: transportWarnings } = chainTransportLegs({
        stopSlugs: [daySchedule[i - 1], slug],
        startDate: date,
        budgetRange: input.budget_range,
        routes,
        departureHour: 9,
      });
      transportLegs = legs.map((leg) => ({
        ...leg,
        origin: destinationNames.get(leg.origin) ?? leg.origin,
        destination: destinationNames.get(leg.destination) ?? leg.destination,
      }));
      warnings.push(...transportWarnings);
    }

    const activityCostTotal = dayActivities.reduce((sum, a) => sum + a.cost_estimate, 0);
    const transportCost = transportLegs.reduce((sum, l) => sum + l.cost_estimate, 0);

    days.push({
      day_number: i + 1,
      date,
      destination: destName,
      transport_legs: transportLegs,
      activities: dayActivities,
      estimated_daily_cost: activityCostTotal + transportCost,
      buffer_minutes: bufferMinutes,
    });
  }

  const totalCost = days.reduce((sum, d) => sum + d.estimated_daily_cost, 0);
  const { pricing_guide, savings_summary } = buildPricingGuide(
    days,
    pricingRecords,
    destinationSlugs
  );

  return {
    days,
    total_estimated_cost: totalCost,
    warnings: [...new Set(warnings)],
    pricing_guide,
    savings_summary,
    generation_source: params.aiActivities ? "ai" : "dataset",
  };
}

export function validateItineraryOutput(
  output: ItineraryOutput,
  expectedDays: number
): string[] {
  const errors: string[] = [];
  if (output.days.length !== expectedDays) {
    errors.push(
      `Expected ${expectedDays} days but got ${output.days.length}.`
    );
  }
  for (const day of output.days) {
    for (const leg of day.transport_legs) {
      if (!leg.verified && leg.risk_flag === "none") {
        errors.push(`Unverified leg ${leg.origin}→${leg.destination} missing risk flag.`);
      }
    }
  }
  return errors;
}
