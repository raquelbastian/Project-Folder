import { z } from "zod";

export const BUDGET_RANGE = ["budget", "mid-range", "flexible"] as const;
export const GROUP_TYPE = ["solo", "couple", "family", "barkada"] as const;
export const INTERESTS = [
  "beach",
  "food",
  "hiking",
  "culture",
  "nightlife",
  "history",
  "diving",
  "photography",
] as const;
export const RISK_FLAG = ["none", "tight_connection", "unverified"] as const;
export const TRANSPORT_MODE = [
  "flight",
  "ferry",
  "bus",
  "van",
  "jeepney",
  "tricycle",
  "boat",
  "train",
] as const;

export const tripInputSchema = z.object({
  destinations: z.array(z.string()).min(1, "Select at least one destination"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  budget_range: z.enum(BUDGET_RANGE),
  group_type: z.enum(GROUP_TYPE),
  interests: z.array(z.string()).optional().default([]),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const transportLegSchema = z.object({
  mode: z.enum(TRANSPORT_MODE),
  origin: z.string(),
  destination: z.string(),
  departure_estimate: z.string(),
  arrival_estimate: z.string(),
  cost_estimate: z.number(),
  risk_flag: z.enum(RISK_FLAG),
  operator_name: z.string().optional(),
  verified: z.boolean().default(true),
});

export type TransportLeg = z.infer<typeof transportLegSchema>;

export const activitySchema = z.object({
  name: z.string(),
  description: z.string(),
  duration_minutes: z.number(),
  cost_estimate: z.number(),
  category: z.string().optional(),
});

export type Activity = z.infer<typeof activitySchema>;

export const daySchema = z.object({
  day_number: z.number(),
  date: z.string(),
  destination: z.string(),
  transport_legs: z.array(transportLegSchema),
  activities: z.array(activitySchema),
  estimated_daily_cost: z.number(),
  buffer_minutes: z.number(),
});

export type ItineraryDay = z.infer<typeof daySchema>;

export const pricingItemSchema = z.object({
  item_name: z.string(),
  local_price_range: z.object({ min: z.number(), max: z.number() }),
  tourist_price_range: z.object({ min: z.number(), max: z.number() }),
  note: z.string(),
  is_stale: z.boolean().default(false),
  last_verified_date: z.string().optional(),
});

export type PricingItem = z.infer<typeof pricingItemSchema>;

export const itineraryOutputSchema = z.object({
  days: z.array(daySchema),
  total_estimated_cost: z.number(),
  warnings: z.array(z.string()),
  pricing_guide: z.array(pricingItemSchema).optional(),
  savings_summary: z
    .object({
      estimated_savings: z.number(),
      note: z.string(),
    })
    .optional(),
  generation_source: z.enum(["ai", "dataset"]).optional().default("dataset"),
});

export type ItineraryOutput = z.infer<typeof itineraryOutputSchema>;

export const generateResponseSchema = z.object({
  success: z.boolean(),
  itinerary: itineraryOutputSchema.optional(),
  error: z.string().optional(),
  unsupported_destinations: z.array(z.string()).optional(),
});

export type GenerateResponse = z.infer<typeof generateResponseSchema>;
