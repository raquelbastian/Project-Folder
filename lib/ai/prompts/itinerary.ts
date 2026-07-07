import type { TripInput } from "@/lib/schemas/itinerary";

export function buildItineraryPrompt(
  input: TripInput,
  datasetContext: string,
  numDays: number
): string {
  return `You are Tara, Pinas! — an expert Philippine travel planner.

Generate a day-by-day activity plan for a trip. You MUST follow these rules:

1. Return ONLY valid JSON matching this structure (no markdown, no prose):
{
  "days": [
    {
      "day_number": 1,
      "activities": [
        {
          "name": "Activity name",
          "description": "Brief description",
          "duration_minutes": 120,
          "category": "sightseeing"
        }
      ]
    }
  ]
}

2. Generate exactly ${numDays} day objects (day_number 1 through ${numDays}).
3. Ground ALL activity suggestions in the provided dataset. Do NOT invent operators, prices, or routes.
4. Do NOT include transport_legs, costs, or pricing — those are computed separately.
5. Budget tier "${input.budget_range}" should influence activity selection (fewer/premium vs more/local experiences).
6. Group type "${input.group_type}" affects pacing — family/barkada need fewer activities per day with more rest time.
7. Match interests where possible: ${(input.interests ?? []).join(", ") || "general sightseeing"}.
8. Destinations for this trip: ${input.destinations.join(", ")}.
9. Trip dates: ${input.start_date} to ${input.end_date}.

CURATED DATASET (use this as your only source of truth for activities):
${datasetContext}

Respond with JSON only.`;
}

export const AI_ACTIVITY_RESPONSE_SCHEMA = {
  days: [
    {
      day_number: "number",
      activities: [
        {
          name: "string",
          description: "string",
          duration_minutes: "number",
          category: "string",
        },
      ],
    },
  ],
};
