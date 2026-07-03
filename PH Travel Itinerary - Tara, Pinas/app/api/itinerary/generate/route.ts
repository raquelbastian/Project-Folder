import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { buildItineraryPrompt } from "@/lib/ai/prompts/itinerary";
import { THRESHOLDS } from "@/lib/config/thresholds";
import {
  buildDatasetContext,
  getActivities,
  getDestinations,
  getPricingEntries,
  getRoutes,
  resolveDestinationSlug,
  validateDestinations,
} from "@/lib/db/dataset";
import { buildItineraryFromDataset, validateItineraryOutput } from "@/lib/itinerary/build";
import {
  generateResponseSchema,
  tripInputSchema,
  type Activity,
} from "@/lib/schemas/itinerary";
import { daysBetween } from "@/lib/utils";

export const maxDuration = 90;

interface AiDayResponse {
  day_number: number;
  activities: Array<{
    name: string;
    description: string;
    duration_minutes: number;
    category?: string;
  }>;
}

async function parseAiActivities(
  text: string,
  input: Parameters<typeof buildItineraryFromDataset>[0]["input"]
): Promise<Record<number, Activity[]> | undefined> {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { days: AiDayResponse[] };
    const result: Record<number, Activity[]> = {};

    for (const day of parsed.days) {
      result[day.day_number] = day.activities.map((a) => ({
        name: a.name,
        description: a.description,
        duration_minutes: a.duration_minutes,
        cost_estimate: 0,
        category: a.category,
      }));
    }

    return result;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = tripInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        generateResponseSchema.parse({
          success: false,
          error: parsed.error.errors.map((e) => e.message).join("; "),
        }),
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (new Date(input.end_date) < new Date(input.start_date)) {
      return NextResponse.json(
        generateResponseSchema.parse({
          success: false,
          error: "End date must be on or after start date.",
        }),
        { status: 400 }
      );
    }

    const { valid, invalid } = await validateDestinations(input.destinations);

    if (invalid.length > 0) {
      return NextResponse.json(
        generateResponseSchema.parse({
          success: false,
          error: `Unsupported destination(s): ${invalid.join(", ")}. Only curated Philippine destinations are supported in v1.`,
          unsupported_destinations: invalid,
        }),
        { status: 422 }
      );
    }

    const numDays = daysBetween(input.start_date, input.end_date);
    if (numDays > 21) {
      return NextResponse.json(
        generateResponseSchema.parse({
          success: false,
          error: "Trips longer than 21 days are not supported in v1.",
        }),
        { status: 400 }
      );
    }

    const slugs: string[] = [];
    for (const name of valid) {
      const slug = await resolveDestinationSlug(name);
      if (slug) slugs.push(slug);
    }

    const [destinations, routes, activities, pricingRecords] = await Promise.all([
      getDestinations(),
      getRoutes(),
      getActivities(slugs),
      getPricingEntries(slugs),
    ]);

    const destinationNames = new Map(destinations.map((d) => [d.slug, d.name]));

    let aiActivities: Record<number, Activity[]> | undefined;

    if (process.env.ANTHROPIC_API_KEY) {
      const datasetContext = await buildDatasetContext({
        ...input,
        destinations: valid,
      });

      const prompt = buildItineraryPrompt(
        { ...input, destinations: valid },
        datasetContext,
        numDays
      );

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        THRESHOLDS.generationTimeoutMs
      );

      try {
        const { text } = await generateText({
          model: anthropic("claude-3-5-sonnet-20241022"),
          prompt,
          abortSignal: controller.signal,
        });
        aiActivities = await parseAiActivities(text, input);
      } catch (aiError) {
        console.warn("AI generation fallback to dataset-only:", aiError);
      } finally {
        clearTimeout(timeout);
      }
    }

    const itinerary = buildItineraryFromDataset({
      input: { ...input, destinations: valid },
      destinationSlugs: slugs,
      destinationNames,
      routes,
      activities,
      pricingRecords,
      aiActivities,
    });

    const validationErrors = validateItineraryOutput(itinerary, numDays);
    if (validationErrors.length > 0) {
      itinerary.warnings.push(...validationErrors);
    }

    return NextResponse.json(
      generateResponseSchema.parse({
        success: true,
        itinerary,
      })
    );
  } catch (error) {
    console.error("Itinerary generation error:", error);
    return NextResponse.json(
      generateResponseSchema.parse({
        success: false,
        error: "Failed to generate itinerary. Please try again.",
      }),
      { status: 500 }
    );
  }
}

export async function GET() {
  const destinations = await getDestinations();
  return NextResponse.json({ destinations });
}
