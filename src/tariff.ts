/** The fare table. Owned by the tariff board, not by this codebase. */
export interface Tariff {
  readonly baseByZone: readonly number[];
  readonly dailyCapCents: number;
  readonly transferWindowMinutes: number;
  readonly reducedMultiplier: number;
  readonly offPeakMultiplier: number;
  readonly peakEndHour: number;
}

export const DEFAULT_TARIFF: Tariff = {
  baseByZone: [290, 360, 480, 545],
  dailyCapCents: 825,
  transferWindowMinutes: 120,
  reducedMultiplier: 0.5,
  offPeakMultiplier: 0.8,
  peakEndHour: 19,
};

export type PassType = "full" | "senior" | "student" | "disability";

export const isReduced = (pass: PassType): boolean => pass !== "full";
