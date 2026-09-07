import type { Tariff } from "../tariff.ts";

/** Base fare for a leg crossing `zones` zones, in cents. */
export function baseFare(tariff: Tariff, zones: number): number {
  if (zones < 1) throw new RangeError("a journey crosses at least one zone");
  const index = Math.min(zones, tariff.baseByZone.length) - 1;
  const fare = tariff.baseByZone[index];
  if (fare === undefined) throw new RangeError(`no base fare for ${String(zones)} zones`);
  return fare;
}
