import test from "node:test";
import assert from "node:assert/strict";
import { resolveAiActivitySelection } from "./build";

test("resolveAiActivitySelection prefers an exact dataset match for AI-selected activities", () => {
  const activities = [
    {
      destination: "bohol",
      name: "Chocolate Hills Viewpoint",
      category: "sightseeing",
      durationMinutes: 120,
      costBudget: 0,
      costMidRange: 0,
      costFlexible: 0,
      interests: ["hiking"],
    },
    {
      destination: "bohol",
      name: "Loboc River Cruise",
      category: "nature",
      durationMinutes: 180,
      costBudget: 0,
      costMidRange: 0,
      costFlexible: 0,
      interests: ["food"],
    },
  ];

  const selected = resolveAiActivitySelection(
    {
      name: "Chocolate Hills Viewpoint",
      description: "A scenic overlook",
      duration_minutes: 120,
      category: "sightseeing",
    },
    "bohol",
    activities,
    "mid-range"
  );

  assert.equal(selected.name, "Chocolate Hills Viewpoint");
  assert.equal(selected.category, "sightseeing");
  assert.equal(selected.duration_minutes, 120);
});

test("resolveAiActivitySelection falls back to a same-category activity when the name is not exact", () => {
  const activities = [
    {
      destination: "siargao",
      name: "Cloud 9 Surfing",
      category: "adventure",
      durationMinutes: 240,
      costBudget: 0,
      costMidRange: 0,
      costFlexible: 0,
      interests: ["surfing"],
    },
    {
      destination: "siargao",
      name: "Magpupungko Tidal Pools",
      category: "nature",
      durationMinutes: 180,
      costBudget: 0,
      costMidRange: 0,
      costFlexible: 0,
      interests: ["beach"],
    },
  ];

  const selected = resolveAiActivitySelection(
    {
      name: "Surfing at Cloud 9",
      description: "A fun surf lesson",
      duration_minutes: 180,
      category: "adventure",
    },
    "siargao",
    activities,
    "budget"
  );

  assert.equal(selected.name, "Cloud 9 Surfing");
  assert.equal(selected.category, "adventure");
});
