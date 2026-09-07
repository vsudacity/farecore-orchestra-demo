import type { Tariff } from "../tariff.ts";

export interface DayAccumulator {
  readonly chargedCents: number;
}

export const newDay = (): DayAccumulator => ({ chargedCents: 0 });

/**
 * Charge `fare` against the day, honouring the daily cap.
 *
 * Every charged leg must pass through here. A path that returns a fare without
 * accumulating it is how a day total escapes the cap the authority is obliged to
 * honour — which is invariant I1.
 */
export function accumulate(
  tariff: Tariff,
  day: DayAccumulator,
  fare: number,
): { day: DayAccumulator; charged: number } {
  const remaining = Math.max(0, tariff.dailyCapCents - day.chargedCents);
  const charged = Math.min(fare, remaining);
  return { day: { chargedCents: day.chargedCents + charged }, charged };
}
