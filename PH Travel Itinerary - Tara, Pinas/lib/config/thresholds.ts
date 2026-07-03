export const THRESHOLDS = {
  /** Minutes of buffer required between inter-modal connections */
  tightConnectionBufferMinutes: 60,
  /** Pricing entries older than this are marked stale (days) */
  pricingStaleDays: 180,
  /** Max time allowed for itinerary generation (ms) */
  generationTimeoutMs: 90_000,
} as const;

export type ThresholdKey = keyof typeof THRESHOLDS;
