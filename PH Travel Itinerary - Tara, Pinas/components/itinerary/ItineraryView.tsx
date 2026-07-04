"use client";

import { Clock, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransportLegs, WarningsList } from "@/components/itinerary/TransportLegs";
import { PricingGuide } from "@/components/itinerary/PricingGuide";
import type { ItineraryOutput } from "@/lib/schemas/itinerary";
import { formatCurrency, formatDuration } from "@/lib/utils";

interface ItineraryViewProps {
  itinerary: ItineraryOutput;
}

export function ItineraryView({ itinerary }: ItineraryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Itinerary</h2>
          <p className="text-muted-foreground">
            {itinerary.days.length} day{itinerary.days.length !== 1 ? "s" : ""} · Estimated total{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(itinerary.total_estimated_cost)}
            </span>
          </p>
        </div>
        <Badge
          variant={itinerary.generation_source === "ai" ? "default" : "secondary"}
          className={
            itinerary.generation_source === "ai"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700"
          }
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          {itinerary.generation_source === "ai" ? "AI-assisted plan" : "Dataset-backed plan"}
        </Badge>
      </div>

      {itinerary.warnings.length > 0 && <WarningsList warnings={itinerary.warnings} />}

      <div className="space-y-4">
        {itinerary.days.map((day) => (
          <Card key={day.day_number} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Day {day.day_number}</Badge>
                <span className="text-sm text-muted-foreground">{day.date}</span>
              </div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                {day.destination}
              </CardTitle>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {day.buffer_minutes} min buffer between activities
                </span>
                <span>Daily est. {formatCurrency(day.estimated_daily_cost)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <TransportLegs legs={day.transport_legs} />

              {day.activities.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Activities
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {day.activities.map((activity, i) => (
                      <div
                        key={`${activity.name}-${i}`}
                        className="rounded-lg border bg-muted/30 p-4"
                      >
                        <p className="font-medium">{activity.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">
                            {formatDuration(activity.duration_minutes)}
                          </Badge>
                          {activity.cost_estimate > 0 && (
                            <Badge variant="outline">
                              {formatCurrency(activity.cost_estimate)}
                            </Badge>
                          )}
                          {activity.category && (
                            <Badge variant="secondary">{activity.category}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {itinerary.pricing_guide && itinerary.pricing_guide.length > 0 && (
        <PricingGuide
          items={itinerary.pricing_guide}
          savingsSummary={itinerary.savings_summary}
        />
      )}
    </div>
  );
}
