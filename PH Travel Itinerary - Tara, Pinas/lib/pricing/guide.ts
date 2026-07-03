import { THRESHOLDS } from "@/lib/config/thresholds";
import type { PricingRecord } from "@/lib/db/dataset";
import type { ItineraryDay, PricingItem } from "@/lib/schemas/itinerary";

function isStale(lastVerifiedDate: string): boolean {
  const verified = new Date(lastVerifiedDate);
  const now = new Date();
  const diffDays = (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > THRESHOLDS.pricingStaleDays;
}

function fuzzyMatch(itemName: string, target: string): boolean {
  const a = itemName.toLowerCase();
  const b = target.toLowerCase();
  return a.includes(b) || b.includes(a) || levenshteinSimilarity(a, b) > 0.6;
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[b.length][a.length];
}

export function buildPricingGuide(
  days: ItineraryDay[],
  pricingRecords: PricingRecord[],
  destinationSlugs: string[]
): {
  pricing_guide: PricingItem[];
  savings_summary: { estimated_savings: number; note: string };
} {
  const items: PricingItem[] = [];
  const seen = new Set<string>();

  const itineraryItems: string[] = [];
  for (const day of days) {
    for (const activity of day.activities) {
      itineraryItems.push(activity.name);
    }
    for (const leg of day.transport_legs) {
      itineraryItems.push(`${leg.mode} ${leg.origin} to ${leg.destination}`);
    }
  }

  for (const record of pricingRecords) {
    if (!destinationSlugs.includes(record.destination)) continue;

    const matched = itineraryItems.some(
      (item) => fuzzyMatch(record.itemName, item) || fuzzyMatch(item, record.itemName)
    );

    const isRelevant =
      matched ||
      itineraryItems.some((item) =>
        record.itemName.toLowerCase().split(" ").some((word) => item.toLowerCase().includes(word) && word.length > 4)
      );

    if (!isRelevant && pricingRecords.length > 20) continue;

    const key = `${record.destination}:${record.itemName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const stale = isStale(record.lastVerifiedDate);

    items.push({
      item_name: record.itemName,
      local_price_range: { min: record.localPriceMin, max: record.localPriceMax },
      tourist_price_range: { min: record.touristPriceMin, max: record.touristPriceMax },
      note: stale
        ? `[STALE DATA] ${record.note} — last verified ${record.lastVerifiedDate}.`
        : record.note,
      is_stale: stale,
      last_verified_date: record.lastVerifiedDate,
    });
  }

  let estimatedSavings = 0;
  for (const item of items.filter((i) => !i.is_stale)) {
    const touristMid = (item.tourist_price_range.min + item.tourist_price_range.max) / 2;
    const localMid = (item.local_price_range.min + item.local_price_range.max) / 2;
    const saving = Math.max(0, touristMid - localMid);
    estimatedSavings += saving;
  }

  return {
    pricing_guide: items.slice(0, 12),
    savings_summary: {
      estimated_savings: Math.round(estimatedSavings),
      note: "Estimated savings if you pay local rates where applicable. Prices are ranges, not guarantees.",
    },
  };
}
