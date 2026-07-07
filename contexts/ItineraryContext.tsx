"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { GenerateResponse, ItineraryOutput, TripInput } from "@/lib/schemas/itinerary";

interface ItineraryContextValue {
  itinerary: ItineraryOutput | null;
  isGenerating: boolean;
  error: string | null;
  generateItinerary: (input: TripInput) => Promise<void>;
  reset: () => void;
}

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

export function ItineraryProvider({ children }: { children: React.ReactNode }) {
  const [itinerary, setItinerary] = useState<ItineraryOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateItinerary = useCallback(async (input: TripInput) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: GenerateResponse = await response.json();

      if (!data.success || !data.itinerary) {
        setError(data.error ?? "Generation failed.");
        setItinerary(null);
        return;
      }

      setItinerary(data.itinerary);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setItinerary(null);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItinerary(null);
    setError(null);
  }, []);

  return (
    <ItineraryContext.Provider
      value={{ itinerary, isGenerating, error, generateItinerary, reset }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const context = useContext(ItineraryContext);
  if (!context) {
    throw new Error("useItinerary must be used within ItineraryProvider");
  }
  return context;
}
