import { loadEnvConfig } from "@next/env";
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

loadEnvConfig(process.cwd());

interface AiDayResponse {
  day_number: number;
  activities: Array<{
    name: string;
    description: string;
    duration_minutes: number;
    category?: string;
  }>;
}

function extractJsonPayload(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1).trim();
  }

  return candidate.trim();
}

async function parseAiActivities(
  text: string,
  input: Parameters<typeof buildItineraryFromDataset>[0]["input"]
): Promise<Record<number, Activity[]> | undefined> {
  try {
    const payload = extractJsonPayload(text);
    const parsed = JSON.parse(payload) as { days: AiDayResponse[] };
    const result: Record<number, Activity[]> = {};

    if (!Array.isArray(parsed.days)) {
      return undefined;
    }

    for (const day of parsed.days) {
      if (!day || !Array.isArray(day.activities)) continue;
      result[day.day_number] = day.activities.map((a) => ({
        name: a.name,
        description: a.description,
        duration_minutes: a.duration_minutes,
        cost_estimate: 0,
        category: a.category,
      }));
    }

    return Object.keys(result).length > 0 ? result : undefined;
  } catch (error) {
    console.warn("Failed to parse AI itinerary JSON:", error, text);
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

    const openAiApiKey = process.env.OPENAI_API_KEY;
    const openAiBaseUrl = process.env.OPENAI_API_BASE_URL || "https://openai.vocareum.com/v1";
    const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (openAiApiKey) {
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
        const response = await fetch(`${openAiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: openAiModel,
            messages: [
              {
                role: "system",
                content:
                  "You are Tara, Pinas. Respond with valid JSON only in the requested itinerary schema.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message || "OpenAI request failed.");
        }

        const text =
          typeof data?.choices?.[0]?.message?.content === "string"
            ? data.choices[0].message.content
            : "";

        if (!text) {
          throw new Error("OpenAI returned an empty response.");
        }

        console.log("Raw AI itinerary response:", text);
        aiActivities = await parseAiActivities(text, input);
        if (!aiActivities) {
          console.warn("AI response was not parsed into itinerary activities.", text);
        }
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
