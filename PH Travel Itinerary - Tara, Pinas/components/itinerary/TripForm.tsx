"use client";

import { useEffect, useState } from "react";
import { Calendar, Compass, Users, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItinerary } from "@/contexts/ItineraryContext";
import {
  BUDGET_RANGE,
  GROUP_TYPE,
  INTERESTS,
  type TripInput,
} from "@/lib/schemas/itinerary";

const SUPPORTED_DESTINATIONS = [
  "Batanes",
  "Mountain Province Region",
  "Ilocos",
  "Cebu",
  "Bohol",
  "Boracay",
  "Siargao",
  "Palawan",
  "Metro Manila",
  "Davao",
  "Cagayan de Oro",
];

function defaultEndDate(start: string): string {
  const d = new Date(start);
  d.setDate(d.getDate() + 4);
  return d.toISOString().split("T")[0];
}

export function TripForm() {
  const { generateItinerary, isGenerating } = useItinerary();
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => defaultEndDate(startDate));
  const [budgetRange, setBudgetRange] = useState<TripInput["budget_range"]>("mid-range");
  const [groupType, setGroupType] = useState<TripInput["group_type"]>("couple");
  const [interests, setInterests] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (new Date(endDate) < new Date(startDate)) {
      setEndDate(defaultEndDate(startDate));
    }
  }, [startDate, endDate]);

  function toggleDestination(name: string) {
    setDestinations((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  function toggleInterest(tag: string) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (destinations.length === 0) {
      setFormError("Select at least one destination.");
      return;
    }

    const input: TripInput = {
      destinations,
      start_date: startDate,
      end_date: endDate,
      budget_range: budgetRange,
      group_type: groupType,
      interests,
    };

    await generateItinerary(input);
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Plan your trip
        </CardTitle>
        <CardDescription>
          Pick destinations, dates, and travel style — we&apos;ll build a grounded day-by-day plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Destinations</Label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_DESTINATIONS.map((dest) => {
                const selected = destinations.includes(dest);
                return (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => toggleDestination(dest)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {dest}
                    {selected ? <X className="ml-1 inline h-3 w-3 opacity-70" /> : null}
                  </button>
                );
              })}
            </div>
            {destinations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {destinations.map((d) => (
                  <Badge key={d} variant="secondary">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Start date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> End date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> Budget
              </Label>
              <Select
                value={budgetRange}
                onValueChange={(v) => setBudgetRange(v as TripInput["budget_range"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGE.map((b) => (
                    <SelectItem key={b} value={b} className="capitalize">
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Group type
              </Label>
              <Select
                value={groupType}
                onValueChange={(v) => setGroupType(v as TripInput["group_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPE.map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Interests (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((tag) => {
                const selected = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                      selected
                        ? "border-accent bg-accent/20 text-accent-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate itinerary"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
