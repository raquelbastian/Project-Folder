# CLAUDE.md

## Project overview
This repository contains Tara, Pinas, a Next.js app for generating AI-assisted Philippine travel itineraries. The app combines curated dataset-driven logic with optional AI suggestions for activity planning.

## Key commands
- Install dependencies: npm install
- Start local dev server: npm run dev
- Build for production: npm run build
- Run lint: npm run lint
- Initialize database (optional): npm run db:setup

## Architecture notes
- App Router structure lives under app/
- UI components are under components/
- Shared itinerary state lives in contexts/
- Business logic and data processing live under lib/
- Curated destinations, pricing, routes, and activities are stored in data/
- Prisma schema and seed scripts are in prisma/

## Development guidance
- Prefer TypeScript and keep components typed.
- Follow the existing Next.js App Router patterns.
- Keep itinerary generation logic deterministic where possible, especially for transport chaining and pricing.
- When touching AI behavior, preserve the fallback to bundled dataset data if API credentials are unavailable.
- Keep environment variable handling minimal and documented.

## Important files
- package.json for scripts and dependencies
- README.md for setup and product context
- spec.md for product requirements and planned scope
- app/api/itinerary/generate/route.ts for itinerary generation entrypoint

## Notes for edits
- Prefer small, focused changes.
- Update related types and data files when changing itinerary structure.
- Verify the app still builds or lint checks after meaningful changes.
