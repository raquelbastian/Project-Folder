import { THRESHOLDS } from "@/lib/config/thresholds";
import type { RouteRecord } from "@/lib/db/dataset";
import type { TransportLeg, TripInput } from "@/lib/schemas/itinerary";

function estimateCost(
  route: RouteRecord,
  budgetRange: TripInput["budget_range"]
): number {
  const { costMin, costMax } = route;
  switch (budgetRange) {
    case "budget":
      return costMin;
    case "mid-range":
      return Math.round((costMin + costMax) / 2);
    case "flexible":
      return costMax;
  }
}

function selectBestRoute(
  routes: RouteRecord[],
  budgetRange: TripInput["budget_range"]
): RouteRecord | null {
  if (routes.length === 0) return null;

  const verified = routes.filter((r) => r.verified);
  const pool = verified.length > 0 ? verified : routes;

  if (budgetRange === "flexible") {
    return pool.reduce((best, r) =>
      r.durationMinutes < best.durationMinutes ? r : best
    );
  }

  return pool.reduce((best, r) => {
    const cost = estimateCost(r, budgetRange);
    const bestCost = estimateCost(best, budgetRange);
    if (cost !== bestCost) return cost < bestCost ? r : best;
    return r.durationMinutes <= best.durationMinutes ? r : best;
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function computeBufferMinutes(groupType: TripInput["group_type"]): number {
  switch (groupType) {
    case "solo":
    case "couple":
      return 30;
    case "family":
    case "barkada":
      return 60;
  }
}

export interface ChainInput {
  stopSlugs: string[];
  startDate: string;
  budgetRange: TripInput["budget_range"];
  routes: RouteRecord[];
  departureHour?: number;
}

export function chainTransportLegs(input: ChainInput): {
  legs: TransportLeg[];
  warnings: string[];
} {
  const { stopSlugs, budgetRange, routes } = input;
  const legs: TransportLeg[] = [];
  const warnings: string[] = [];

  if (stopSlugs.length < 2) return { legs, warnings };

  let currentTime = new Date(`${input.startDate}T${input.departureHour ?? 8}:00:00`);

  for (let i = 0; i < stopSlugs.length - 1; i++) {
    const origin = stopSlugs[i];
    const destination = stopSlugs[i + 1];
    const candidates = routes.filter(
      (r) => r.origin === origin && r.destination === destination
    );

    if (candidates.length === 0) {
      warnings.push(
        `No verified route data for ${origin} → ${destination}. Transport leg marked unverified.`
      );
      legs.push({
        mode: "van",
        origin,
        destination,
        departure_estimate: formatTime(currentTime),
        arrival_estimate: formatTime(currentTime),
        cost_estimate: 0,
        risk_flag: "unverified",
        verified: false,
      });
      continue;
    }

    const selected = selectBestRoute(candidates, budgetRange);
    if (!selected) continue;

    if (!selected.verified) {
      warnings.push(
        `Route ${origin} → ${destination} (${selected.mode}) is unverified in our dataset.`
      );
    }

    const departure = new Date(currentTime);
    const arrival = new Date(currentTime);
    arrival.setMinutes(arrival.getMinutes() + selected.durationMinutes);

    let riskFlag: TransportLeg["risk_flag"] = selected.verified ? "none" : "unverified";

    if (i > 0 && legs.length > 0) {
      const prevLeg = legs[legs.length - 1];
      const prevArrival = parseTimeOnDate(prevLeg.arrival_estimate, input.startDate);
      const bufferMs = departure.getTime() - prevArrival.getTime();
      const bufferMinutes = bufferMs / (1000 * 60);

      if (
        bufferMinutes < THRESHOLDS.tightConnectionBufferMinutes &&
        prevLeg.mode !== selected.mode
      ) {
        riskFlag = "tight_connection";
        warnings.push(
          `Tight connection (${Math.round(bufferMinutes)} min buffer) between ${prevLeg.destination} and ${selected.origin} via ${selected.mode}.`
        );
      }
    }

    legs.push({
      mode: selected.mode as TransportLeg["mode"],
      origin: selected.origin,
      destination: selected.destination,
      departure_estimate: formatTime(departure),
      arrival_estimate: formatTime(arrival),
      cost_estimate: estimateCost(selected, budgetRange),
      risk_flag: riskFlag,
      operator_name: selected.operatorName ?? undefined,
      verified: selected.verified,
    });

    currentTime = new Date(arrival);
    currentTime.setMinutes(
      currentTime.getMinutes() + THRESHOLDS.tightConnectionBufferMinutes / 2
    );
  }

  return { legs, warnings };
}

function parseTimeOnDate(timeStr: string, dateStr: string): Date {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return new Date(`${dateStr}T08:00:00`);
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
}

export function distributeDestinationsAcrossDays(
  destinationSlugs: string[],
  numDays: number
): string[] {
  if (numDays <= 0) return [];
  if (destinationSlugs.length === 0) return Array(numDays).fill("metro-manila");
  if (destinationSlugs.length === 1) return Array(numDays).fill(destinationSlugs[0]);

  const schedule: string[] = [];
  let destIndex = 0;
  const daysPerDest = Math.max(1, Math.floor(numDays / destinationSlugs.length));

  for (let day = 0; day < numDays; day++) {
    if (day > 0 && day % daysPerDest === 0 && destIndex < destinationSlugs.length - 1) {
      destIndex++;
    }
    schedule.push(destinationSlugs[destIndex]);
  }

  return schedule;
}
