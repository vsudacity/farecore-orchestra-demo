import { isReduced, type PassType, type Tariff } from "../tariff.ts";

/** Apply the reduced-fare entitlement. Never returns more than the full fare. */
export function applyReduction(tariff: Tariff, fare: number, pass: PassType): number {
  if (!isReduced(pass)) return fare;
  return Math.round(fare * tariff.reducedMultiplier);
}

/** Off-peak discount, applied after the reduced-fare entitlement. */
export function applyOffPeak(tariff: Tariff, fare: number, hour: number): number {
  return hour >= tariff.peakEndHour ? Math.round(fare * tariff.offPeakMultiplier) : fare;
}
