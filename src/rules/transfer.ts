import { applyOffPeak, applyReduction } from "./reduced.ts";
import { baseFare } from "./zones.ts";
import { accumulate, type DayAccumulator } from "./cap.ts";
import type { PassType, Tariff } from "../tariff.ts";

export interface Leg {
  readonly zones: number;
  readonly minuteOfDay: number;
  readonly pass: PassType;
}

export const withinTransferWindow = (tariff: Tariff, previous: Leg, current: Leg): boolean =>
  current.minuteOfDay - previous.minuteOfDay <= tariff.transferWindowMinutes;

/**
 * Charge one leg.
 *
 * A leg inside the transfer window pays no second base fare. It may still pay a
 * zone *upgrade* when it travels further than the leg it transferred from — that
 * is a difference, never a new boarding, so it stays well below base.
 *
 * Everything charged goes through the cap accumulator. A path that returns a fare
 * without accumulating it is how a day escapes the cap, which is invariant I1.
 */
export function chargeLeg(
  tariff: Tariff,
  day: DayAccumulator,
  leg: Leg,
  previous: Leg | null,
): { day: DayAccumulator; charged: number } {
  const hour = Math.floor(leg.minuteOfDay / 60);

  if (previous !== null && withinTransferWindow(tariff, previous, leg)) {
    const upgrade = baseFare(tariff, leg.zones) - baseFare(tariff, previous.zones);
    if (upgrade <= 0) return accumulate(tariff, day, 0);

    // The reduced-fare entitlement applies to evening upgrades too, and the result
    // still goes through the accumulator — which is what the naive fix skipped.
    return accumulate(tariff, day, applyReduction(tariff, upgrade, leg.pass));
  }

  const base = baseFare(tariff, leg.zones);
  const reduced = applyReduction(tariff, base, leg.pass);
  const fare = applyOffPeak(tariff, reduced, hour);
  return accumulate(tariff, day, fare);
}
