import test from "node:test";
import assert from "node:assert/strict";
import { resolveAiActivitySelection, selectActivitiesForDay } from "./build";

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

test("selectActivitiesForDay excludes previously selected activities", () => {
  const activities = [
    {
      destination: "bohol",
      name: "Chocolate Hills",
      category: "sightseeing",
      durationMinutes: 120,
      costBudget: 100,
      costMidRange: 150,
      costFlexible: 200,
      interests: ["hiking"],
    },
    {
      destination: "bohol",
      name: "Loboc River Cruise",
      category: "nature",
      durationMinutes: 180,
      costBudget: 200,
      costMidRange: 300,
      costFlexible: 400,
      interests: ["food"],
    },
    {
      destination: "bohol",
      name: "Tarsier Sanctuary",
      category: "wildlife",
      durationMinutes: 100,
      costBudget: 150,
      costMidRange: 200,
      costFlexible: 300,
      interests: ["nature"],
    },
  ];

  // First day activities
  const day1 = selectActivitiesForDay("bohol", activities, "mid-range", [], 3, new Set());
  assert(day1.some((a) => a.name === "Chocolate Hills"));

  // Second day activities should exclude day 1 activities
  const excludedNames = new Set(day1.map((a) => a.name));
  const day2 = selectActivitiesForDay("bohol", activities, "mid-range", [], 3, excludedNames);
  
  // Day 2 should have different activities
  const day2Names = new Set(day2.map((a) => a.name));
  for (const name of excludedNames) {
    assert(!day2Names.has(name), `Activity "${name}" should not appear in day 2`);
  }
});
