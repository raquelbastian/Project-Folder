"use client";

import { ItineraryProvider, useItinerary } from "@/contexts/ItineraryContext";
import { TripForm } from "@/components/itinerary/TripForm";
import { ItineraryView } from "@/components/itinerary/ItineraryView";
import { GenerationProgress } from "@/components/itinerary/GenerationProgress";
import { Button } from "@/components/ui/button";
import { MapPin, Palmtree, Sparkles } from "lucide-react";

function HomeContent() {
  const { itinerary, isGenerating, error, reset } = useItinerary();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0077BE] via-[#005A8C] to-[#2E8B57] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#FFD700]" />
          <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-[#FF6B6B]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="flex items-center gap-2 text-[#FFD700]">
            <Palmtree className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              Tara, Pinas!
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Your Philippine adventure,
            <br />
            <span className="text-[#FFD700]">planned in minutes.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-blue-100">
            AI-powered itineraries grounded in curated transport routes, inter-island connections,
            and local-vs-tourist pricing — so you travel smarter across the archipelago.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-blue-100">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-[#FFD700]" /> 11 destinations
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-[#FFD700]" /> Dataset-backed routes & pricing
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <TripForm />
          </div>

          <div className="lg:col-span-3">
            {isGenerating && <GenerationProgress />}

            {error && !isGenerating && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="font-medium text-destructive">{error}</p>
                <Button variant="outline" className="mt-4" onClick={reset}>
                  Try again
                </Button>
              </div>
            )}

            {itinerary && !isGenerating && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Plan another trip
                  </Button>
                </div>
                <ItineraryView itinerary={itinerary} />
              </div>
            )}

            {!itinerary && !isGenerating && !error && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <Palmtree className="mb-4 h-12 w-12 text-primary/40" />
                <p className="text-lg font-medium">Your itinerary will appear here</p>
                <p className="mt-1 max-w-sm text-sm">
                  Select destinations and hit generate — no account needed.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Tara, Pinas! · Philippine travel planning · Estimates only, not bookings</p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <ItineraryProvider>
      <HomeContent />
    </ItineraryProvider>
  );
}
