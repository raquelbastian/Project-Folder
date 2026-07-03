# Tara, Pinas!

AI-powered Philippine travel itinerary planner — grounded in curated transport routes, inter-island connection chaining, and local-vs-tourist pricing guides.

## Tech Stack

- **Next.js 14** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui-style components
- **Supabase** (PostgreSQL, Auth, Storage) + **Prisma ORM**
- **Vercel AI SDK** + Anthropic Claude 3.5 Sonnet
- Deployed on **Vercel**

## Features (v1)

1. **AI Itinerary Generator** — day-by-day plans from trip parameters
2. **Inter-Island Transport Chaining** — sequenced legs with risk flags
3. **Local vs. Tourist Pricing Guide** — dataset-backed rate comparisons

> Features 4 & 5 (conversational edits, persistence) are deferred.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- (Optional) Supabase project for database seeding
- (Optional) Anthropic API key for AI-enhanced activity suggestions

### Install

```bash
npm install
cp .env.example .env.local
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Optional* | Supabase PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key |
| `ANTHROPIC_API_KEY` | Optional | Enables Claude activity planning (falls back to dataset-only) |

\*Without `DATABASE_URL`, the app uses bundled JSON seed data in `/data`.

### Database Setup (optional)

```bash
npm run db:setup
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

**Approach A (hybrid):**
- **AI (Claude)** suggests day-by-day activities from the curated dataset
- **Deterministic engine** handles transport chaining, risk flags, pricing guide, and cost estimates
- **JSON fallback** when database is not configured

## Supported Destinations

Batanes, Mountain Province Region, Ilocos, Cebu, Bohol, Boracay, Siargao, Palawan, Metro Manila, Davao, Cagayan de Oro

## Project Structure

```
app/                  # Next.js App Router pages & API routes
components/           # UI + itinerary feature components
contexts/             # React Context (itinerary state)
data/                 # Curated seed JSON (destinations, routes, pricing)
lib/                  # Business logic (transport, pricing, AI, db)
prisma/               # Schema & seed script
```

## License

Private — all rights reserved.
