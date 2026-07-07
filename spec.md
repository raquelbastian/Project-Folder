# Tara, Pinas! — Spec: Core Features (v1)

**Status**: Draft
**Last updated**: June 30, 2026

This spec covers all 3 core v1 features. Each follows the same structure: Context & Goal, Inputs & Outputs, Behavior Rules, Constraints, Acceptance Criteria.

## Tech Stack & Architecture

### Frontend
- **Framework:** Next.js 14 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context API (keep it simple, no Redux)

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **ORM / Query Builder:** Prisma ORM
- **Authentication:** Supabase Auth (Email/Password & Google OAuth)
- **File Storage:** Supabase Storage (for user avatars and project uploads)

### AI/LLM
We are utilizing the **Vercel AI SDK** as the unified interface to orchestrate and stream model responses, providing the flexibility to switch or combine upstream LLM providers.

**Core SDK:** `ai` (Vercel AI SDK)
### **Primary Providers:**
### - **Anthropic (Claude):** Used for advanced reasoning, complex coding tasks, and nuanced content generation (via `@ai-sdk/anthropic`).
**Primary Logic Model:** `gemini-1.5-pro` for deep reasoning, heavy context, nuanced content generation and complex coding (via @ai-sdk/google)

| Component | Technology / Provider | Purpose |
| :--- | :--- | :--- |
| **Orchestration Layer** | Vercel AI SDK | Streaming responses, UI hooks (`useChat`), and tool calling. |
| **Reasoning / Complex Tasks** | Anthropic (Claude 3.5 Sonnet) | Long-context understanding and deep analytical tasks. |

### Package Management & Deployment
- **Package Manager:** npm
- **Deployment Platform:** Vercel

---

# 1. AI Itinerary Generator

## Context & Goal
Travelers waste hours manually researching routes, fares, and logistics across scattered sources. This feature takes a traveler's trip parameters and produces a personalized, day-by-day itinerary that sequences transport and activities realistically and within budget.

## Inputs & Outputs

**Inputs**

| Field | Type | Required | Notes |
|---|---|---|---|
| `destinations` | array of strings | Yes | One or more Philippine destinations from the supported list |
| `start_date`, `end_date` | date | Yes | Trip duration derived from these |
| `budget_range` | enum (budget / mid-range / flexible) | Yes | Drives activity and transport recommendations |
| `group_type` | enum (solo / couple / family / barkada) | Yes | Affects pacing and activity selection |
| `interests` | array of tags | No | e.g., beach, food, hiking, culture, nightlife |

**Outputs**
- `days`: array of day objects with `transport_legs`, `activities`, `estimated_daily_cost`
- `total_estimated_cost`
- `warnings`: flagged items where data confidence is low

## Behavior Rules
1. Ground itinerary content in the curated transport/pricing dataset; don't invent routes or prices.
2. Number of days generated must exactly match `end_date - start_date`.
3. `budget_range` must visibly influence transport/activity choices.
4. Family/barkada itineraries get more buffer time between activities than solo/couple itineraries.
5. Low-confidence routes are flagged via `warnings`, never silently presented as verified.

## Constraints
- Only destinations in the curated dataset are supported in v1.
- No booking or payment claims in the output.
- Generation must complete within 90 seconds.
- Output must be strict, schema-conformant JSON only.

## Acceptance Criteria
- [ ] Valid input for a supported destination returns a complete itinerary within 90 seconds.
- [ ] Every transport leg matches a verified route or carries a warning.
- [ ] Budget tier visibly changes recommendations vs. a flexible-budget request for the same trip.
- [ ] Family/barkada itineraries show measurably more buffer time than solo/couple itineraries.
- [ ] Unsupported destination requests return a clear rejection, not a fabricated plan.

---

# 2. Inter-Island Transport Chaining

## Context & Goal
Island-hopping trips require chaining multiple transport modes (flight → van → boat) with tight connections that are easy to misjudge. This feature automatically sequences transport legs between itinerary stops and flags risky connections.

## Inputs & Outputs

**Inputs**
- Ordered list of stops (derived from the itinerary's destinations and day sequence)
- Per-leg constraints: earliest departure, latest arrival (derived from day plan)

**Outputs**
- `transport_legs`: array of `{ mode, origin, destination, departure_estimate, arrival_estimate, cost_estimate, risk_flag }`
- `risk_flag` values: `none`, `tight_connection`, `unverified`

## Behavior Rules
1. Sequence legs in the order stops appear in the itinerary; no skipped or reordered stops.
2. Compute estimated transit time between connecting legs; if buffer time falls below a defined threshold (e.g., <60 minutes for inter-modal connections), set `risk_flag = tight_connection`.
3. If a route/schedule isn't present in the dataset, set `risk_flag = unverified` rather than guessing a schedule.
4. Prefer the lowest-cost mode that fits the day's time budget, unless `budget_range = flexible` favors faster/premium options.

## Constraints
- Schedule and fare data must come from the curated dataset; no invented operator names or times.
- Risk threshold values must be configurable, not hardcoded per request.
- Must handle at least 2–4 chained legs per day without performance degradation.

## Acceptance Criteria
- [ ] Output legs are in correct stop order matching the itinerary.
- [ ] Any connection under the buffer threshold is flagged `tight_connection`.
- [ ] Any leg without dataset backing is flagged `unverified`, never presented as confirmed.
- [ ] Budget-tier preference is reflected in mode selection when multiple valid options exist.

---

# 3. Local vs. Tourist Pricing Guide

## Context & Goal
Travelers often overpay because they don't know typical local rates for transport, food, and activities. This feature surfaces local-vs-tourist pricing context so users can budget realistically and avoid overpaying.

## Inputs & Outputs

**Inputs**
- Destination(s) and the specific transport/activity items already included in the generated itinerary

**Outputs**
- Per relevant item: `{ item_name, local_price_range, tourist_price_range, note }`
- A summary section: estimated total savings potential if local rates are used where applicable

## Behavior Rules
1. Only show pricing comparisons for items with dataset-backed local pricing data; omit rather than guess.
2. Present ranges, not single fabricated numbers, to reflect real-world variability.
3. Notes should be practical and specific (e.g., a typical local fare-negotiation tip), not generic disclaimers.
4. Pricing guide content must update if the underlying itinerary changes (e.g., after a conversational edit).

## Constraints
- Pricing data must carry a `last_verified_date`; stale entries (beyond a defined threshold) are excluded or marked stale rather than shown as current.
- No claims of guaranteed pricing — always framed as estimates.

## Acceptance Criteria
- [ ] Every priced item in the guide traces back to a dataset entry with a verification date.
- [ ] No item is shown with only a single fabricated price point.
- [ ] Stale entries (past threshold) are visibly marked or excluded.
- [ ] Pricing guide reflects the current itinerary state after edits.