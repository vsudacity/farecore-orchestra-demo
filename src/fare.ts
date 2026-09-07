import { chargeLeg, type Leg } from "./rules/transfer.ts";
import { newDay } from "./rules/cap.ts";
import { DEFAULT_TARIFF, type Tariff } from "./tariff.ts";

export interface DayCharge {
  readonly perLeg: readonly number[];
  readonly total: number;
}

/** Charge a rider's whole service day. */
export function chargeDay(legs: readonly Leg[], tariff: Tariff = DEFAULT_TARIFF): DayCharge {
  let day = newDay();
  const perLeg: number[] = [];
  let previous: Leg | null = null;

  for (const leg of legs) {
    const result = chargeLeg(tariff, day, leg, previous);
    day = result.day;
    perLeg.push(result.charged);
    previous = leg;
  }

  return { perLeg, total: day.chargedCents };
}

export { DEFAULT_TARIFF } from "./tariff.ts";
export type { Leg } from "./rules/transfer.ts";
export type { PassType, Tariff } from "./tariff.ts";
