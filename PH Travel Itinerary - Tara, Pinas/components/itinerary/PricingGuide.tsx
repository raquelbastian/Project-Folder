"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricingItem } from "@/lib/schemas/itinerary";
import { formatCurrency } from "@/lib/utils";
import { PiggyBank, TrendingDown } from "lucide-react";

interface PricingGuideProps {
  items: PricingItem[];
  savingsSummary?: {
    estimated_savings: number;
    note: string;
  };
}

export function PricingGuide({ items, savingsSummary }: PricingGuideProps) {
  if (items.length === 0) return null;

  return (
    <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-emerald-600" />
          Local vs. Tourist Pricing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pay closer to local rates with these benchmarks — always estimates, never guarantees.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {savingsSummary && savingsSummary.estimated_savings > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-100/60 p-3">
            <PiggyBank className="h-5 w-5 text-emerald-700" />
            <div>
              <p className="font-semibold text-emerald-900">
                Up to {formatCurrency(savingsSummary.estimated_savings)} potential savings
              </p>
              <p className="text-xs text-emerald-700">{savingsSummary.note}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.item_name}
              className="rounded-lg border bg-background/80 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.item_name}</span>
                {item.is_stale && <Badge variant="warning">Stale data</Badge>}
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Local rate: </span>
                  <span className="font-medium text-emerald-700">
                    {formatCurrency(item.local_price_range.min)} –{" "}
                    {formatCurrency(item.local_price_range.max)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tourist rate: </span>
                  <span className="font-medium text-amber-700">
                    {formatCurrency(item.tourist_price_range.min)} –{" "}
                    {formatCurrency(item.tourist_price_range.max)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
