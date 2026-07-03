"use client";

import { Loader2, MapPin, Sparkles } from "lucide-react";

export function GenerationProgress() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-12 text-center">
      <div className="relative">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-accent" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">Planning your trip…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sequencing transport, activities, and local pricing tips across the islands.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>Grounded in curated PH travel data</span>
      </div>
    </div>
  );
}
