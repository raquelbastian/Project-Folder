import test from "node:test";
import assert from "node:assert/strict";
import {
  chainTransportLegs,
  computeBufferMinutes,
  distributeDestinationsAcrossDays,
} from "./chain";
import type { RouteRecord } from "@/lib/db/dataset";
import type { TripInput } from "@/lib/schemas/itinerary";

test("computeBufferMinutes returns 30 for solo and couple", () => {
  assert.equal(computeBufferMinutes("solo"), 30);
  assert.equal(computeBufferMinutes("couple"), 30);
});

test("computeBufferMinutes returns 60 for family and barkada", () => {
  assert.equal(computeBufferMinutes("family"), 60);
  assert.equal(computeBufferMinutes("barkada"), 60);
});

test("distributeDestinationsAcrossDays handles empty inputs", () => {
  assert.deepEqual(distributeDestinationsAcrossDays([], 3), ["metro-manila", "metro-manila", "metro-manila"]);
  assert.deepEqual(distributeDestinationsAcrossDays(["bohol"], 0), []);
});

test("distributeDestinationsAcrossDays repeats single destination across all days", () => {
  const result = distributeDestinationsAcrossDays(["bohol"], 5);
  assert.deepEqual(result, ["bohol", "bohol", "bohol", "bohol", "bohol"]);
});

test("distributeDestinationsAcrossDays distributes multiple destinations", () => {
  const result = distributeDestinationsAcrossDays(["bohol", "cebu", "siargao"], 9);
  assert.equal(result.length, 9);
  assert.equal(result[0], "bohol");
  assert.equal(result[3], "cebu");
  assert.equal(result[6], "siargao");
});

test("distributeDestinationsAcrossDays cycles through destinations when days < destinations", () => {
  const result = distributeDestinationsAcrossDays(["bohol", "cebu", "siargao"], 2);
  assert.deepEqual(result, ["bohol", "cebu"]);
});

test("chainTransportLegs returns empty legs for single stop", () => {
  const result = chainTransportLegs({
    stopSlugs: ["bohol"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes: [],
  });

  assert.deepEqual(result.legs, []);
  assert.deepEqual(result.warnings, []);
});

test("chainTransportLegs creates unverified leg when no route found", () => {
  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes: [],
  });

  assert.equal(result.legs.length, 1);
  assert.equal(result.legs[0].verified, false);
  assert.equal(result.legs[0].risk_flag, "unverified");
  assert(result.warnings.length > 0);
});

test("chainTransportLegs selects cheapest route for budget trips", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 480,
      costMin: 500,
      costMax: 800,
      operatorName: "Budget Tours",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
    {
      origin: "bohol",
      destination: "siargao",
      mode: "ferry",
      durationMinutes: 360,
      costMin: 1000,
      costMax: 1500,
      operatorName: "Ferry Co",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "budget",
    routes,
  });

  assert.equal(result.legs.length, 1);
  assert.equal(result.legs[0].mode, "van");
  assert.equal(result.legs[0].cost_estimate, 500);
});

test("chainTransportLegs selects fastest route for flexible trips", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 480,
      costMin: 500,
      costMax: 800,
      operatorName: "Budget Tours",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
    {
      origin: "bohol",
      destination: "siargao",
      mode: "ferry",
      durationMinutes: 240,
      costMin: 1000,
      costMax: 1500,
      operatorName: "Ferry Co",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "flexible",
    routes,
  });

  assert.equal(result.legs.length, 1);
  assert.equal(result.legs[0].mode, "ferry");
});

test("chainTransportLegs chains multiple transport legs", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "cebu",
      mode: "ferry",
      durationMinutes: 120,
      costMin: 300,
      costMax: 500,
      operatorName: "Ferry Co",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
    {
      origin: "cebu",
      destination: "siargao",
      mode: "plane",
      durationMinutes: 90,
      costMin: 2000,
      costMax: 3000,
      operatorName: "Airline Co",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "cebu", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes,
  });

  assert.equal(result.legs.length, 2);
  assert.equal(result.legs[0].origin, "bohol");
  assert.equal(result.legs[0].destination, "cebu");
  assert.equal(result.legs[1].origin, "cebu");
  assert.equal(result.legs[1].destination, "siargao");
});

test("chainTransportLegs warns about unverified routes", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 480,
      costMin: 500,
      costMax: 800,
      operatorName: "Budget Tours",
      verified: false,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes,
  });

  assert.equal(result.legs[0].verified, false);
  assert.equal(result.legs[0].risk_flag, "unverified");
  assert(result.warnings.some((w) => w.includes("unverified")));
});

test("chainTransportLegs uses custom departure hour", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 120,
      costMin: 500,
      costMax: 800,
      operatorName: "Budget Tours",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes,
    departureHour: 14,
  });

  assert.equal(result.legs[0].departure_estimate.includes("2:00 PM"), true);
});

test("chainTransportLegs respects mid-range budget option", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 480,
      costMin: 500,
      costMax: 1000,
      operatorName: "Tours",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "mid-range",
    routes,
  });

  // Mid-range should pick middle: (500 + 1000) / 2 = 750
  assert.equal(result.legs[0].cost_estimate, 750);
});

test("chainTransportLegs respects flexible budget option", () => {
  const routes: RouteRecord[] = [
    {
      origin: "bohol",
      destination: "siargao",
      mode: "van",
      durationMinutes: 480,
      costMin: 500,
      costMax: 1500,
      operatorName: "Tours",
      verified: true,
      scheduleNotes: null,
      lastVerifiedDate: "2026-06-01",
    },
  ];

  const result = chainTransportLegs({
    stopSlugs: ["bohol", "siargao"],
    startDate: "2026-07-08",
    budgetRange: "flexible",
    routes,
  });

  // Flexible should pick max: 1500
  assert.equal(result.legs[0].cost_estimate, 1500);
});
