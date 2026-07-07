import test from "node:test";
import assert from "node:assert/strict";
import { buildPricingGuide } from "./guide";
import type { ItineraryDay, PricingItem } from "@/lib/schemas/itinerary";
import type { PricingRecord } from "@/lib/db/dataset";

test("buildPricingGuide includes relevant pricing items", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "bohol",
      date: "2026-07-08",
      activities: [
        {
          name: "Chocolate Hills Viewpoint",
          description: "Scenic overlook",
          duration_minutes: 120,
          cost_estimate: 0,
          category: "sightseeing",
        },
      ],
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = [
    {
      destination: "bohol",
      itemName: "Chocolate Hills Viewpoint",
      category: "sightseeing",
      localPriceMin: 0,
      localPriceMax: 50,
      touristPriceMin: 100,
      touristPriceMax: 150,
      note: "Popular tourist attraction",
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = buildPricingGuide(days, pricingRecords, ["bohol"]);

  assert.equal(result.pricing_guide.length, 1);
  assert.equal(result.pricing_guide[0].item_name, "Chocolate Hills Viewpoint");
  assert.equal(result.pricing_guide[0].tourist_price_range.min, 100);
});

test("buildPricingGuide marks stale pricing data", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "siargao",
      date: "2026-07-08",
      activities: [
        {
          name: "Cloud 9 Surfing",
          description: "Surf lesson",
          duration_minutes: 180,
          cost_estimate: 0,
          category: "adventure",
        },
      ],
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = [
    {
      destination: "siargao",
      itemName: "Cloud 9 Surfing",
      category: "adventure",
      localPriceMin: 500,
      localPriceMax: 800,
      touristPriceMin: 1200,
      touristPriceMax: 1500,
      note: "Lesson includes board rental",
      lastVerifiedDate: "2025-01-01", // Over 1 year old (stale)
    },
  ];

  const result = buildPricingGuide(days, pricingRecords, ["siargao"]);

  assert.equal(result.pricing_guide.length, 1);
  assert.equal(result.pricing_guide[0].is_stale, true);
  assert(result.pricing_guide[0].note.includes("[STALE DATA]"));
});

test("buildPricingGuide filters by destination slugs", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "bohol",
      date: "2026-07-08",
      activities: [
        {
          name: "Loboc River Cruise",
          description: "River tour",
          duration_minutes: 180,
          cost_estimate: 0,
          category: "nature",
        },
      ],
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = [
    {
      destination: "bohol",
      itemName: "Loboc River Cruise",
      category: "nature",
      localPriceMin: 300,
      localPriceMax: 500,
      touristPriceMin: 800,
      touristPriceMax: 1200,
      note: "Includes lunch",
      lastVerifiedDate: "2026-06-15",
    },
    {
      destination: "cebu", // Different destination
      itemName: "Whale Watching",
      category: "wildlife",
      localPriceMin: 1000,
      localPriceMax: 1500,
      touristPriceMin: 2000,
      touristPriceMax: 2500,
      note: "Seasonal activity",
      lastVerifiedDate: "2026-06-15",
    },
  ];

  const result = buildPricingGuide(days, pricingRecords, ["bohol"]);

  assert.equal(result.pricing_guide.length, 1);
  assert.equal(result.pricing_guide[0].item_name, "Loboc River Cruise");
});

test("buildPricingGuide avoids duplicate items", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "bohol",
      date: "2026-07-08",
      activities: [
        {
          name: "Chocolate Hills",
          description: "Scenic viewpoint",
          duration_minutes: 120,
          cost_estimate: 0,
          category: "sightseeing",
        },
      ],
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = [
    {
      destination: "bohol",
      itemName: "Chocolate Hills Viewpoint",
      category: "sightseeing",
      localPriceMin: 0,
      localPriceMax: 50,
      touristPriceMin: 100,
      touristPriceMax: 150,
      note: "Entry fee",
      lastVerifiedDate: "2026-06-15",
    },
    {
      destination: "bohol",
      itemName: "Chocolate Hills Viewpoint",
      category: "sightseeing",
      localPriceMin: 0,
      localPriceMax: 60,
      touristPriceMin: 110,
      touristPriceMax: 160,
      note: "Updated entry fee",
      lastVerifiedDate: "2026-06-20",
    },
  ];

  const result = buildPricingGuide(days, pricingRecords, ["bohol"]);

  assert.equal(result.pricing_guide.length, 1);
});

test("buildPricingGuide calculates estimated savings correctly", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "bohol",
      date: "2026-07-08",
      activities: [
        {
          name: "Tarsier Sanctuary",
          description: "Wildlife tour",
          duration_minutes: 120,
          cost_estimate: 0,
          category: "nature",
        },
      ],
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = [
    {
      destination: "bohol",
      itemName: "Tarsier Sanctuary",
      category: "wildlife",
      localPriceMin: 100,
      localPriceMax: 200,
      touristPriceMin: 400,
      touristPriceMax: 600,
      note: "Popular attraction",
      lastVerifiedDate: "2026-06-15",
    },
  ];

  const result = buildPricingGuide(days, pricingRecords, ["bohol"]);

  // Tourist mid: (400 + 600) / 2 = 500
  // Local mid: (100 + 200) / 2 = 150
  // Savings: 500 - 150 = 350
  assert.equal(result.savings_summary.estimated_savings, 350);
});

test("buildPricingGuide returns max 12 items", () => {
  const days: ItineraryDay[] = [
    {
      day_number: 1,
      destination: "bohol",
      date: "2026-07-08",
      activities: Array(15)
        .fill(null)
        .map((_, i) => ({
          name: `Activity ${i}`,
          description: `Activity ${i}`,
          duration_minutes: 120,
          cost_estimate: 0,
          category: "sightseeing" as const,
        })),
      transport_legs: [],
      estimated_daily_cost: 0,
      buffer_minutes: 30,
    },
  ];

  const pricingRecords: PricingRecord[] = Array(20)
    .fill(null)
    .map((_, i) => ({
      destination: "bohol",
      itemName: `Activity ${i}`,
      category: "sightseeing",
      localPriceMin: 100 + i * 10,
      localPriceMax: 200 + i * 10,
      touristPriceMin: 400 + i * 20,
      touristPriceMax: 600 + i * 20,
      note: `Activity ${i} pricing`,
      lastVerifiedDate: "2026-06-15",
    }));

  const result = buildPricingGuide(days, pricingRecords, ["bohol"]);

  assert(result.pricing_guide.length <= 12);
});
