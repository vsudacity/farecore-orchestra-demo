/**
 * The invariant suite. This is what the gate runs, and it is the reason a fix can
 * pass its own bug report and still be rejected.
 *
 * Each invariant is a property over generated days, not an example. `check` returns
 * findings in the gate's shape: path, line, rule, and a remediation drawn from a
 * closed set — a remediation of "fix it" is not actionable and must not be possible.
 */
import { chargeDay } from "../src/fare.ts";
import { baseFare } from "../src/rules/zones.ts";
import { applyReduction } from "../src/rules/reduced.ts";
import { DEFAULT_TARIFF, type PassType, type Tariff } from "../src/tariff.ts";
import type { Leg } from "../src/rules/transfer.ts";

export const INVARIANT_IDS = ["I1", "I2", "I3", "I4", "I5"] as const;
export type InvariantId = (typeof INVARIANT_IDS)[number];

export const REMEDIATIONS = [
  "update-cap-accumulator",
  "apply-transfer-credit",
  "clamp-reduced-to-full",
  "order-zone-table",
  "reconcile-day-total",
] as const;
export type Remediation = (typeof REMEDIATIONS)[number];

export interface Finding {
  readonly path: string;
  readonly line: number;
  readonly rule: InvariantId;
  readonly remediation: Remediation;
  readonly detail: string;
}

const PASSES: readonly PassType[] = ["full", "senior", "student", "disability"];

/**
 * Deterministic day generator — replay must reproduce the same counterexample.
 *
 * Purely random days almost never land on the interesting region (an evening leg,
 * inside the transfer window, moving to a further zone, on a heavy travel day), so
 * the suite generates that boundary deliberately as well as sampling broadly. A
 * property that never reaches the code it is meant to constrain is vacuous.
 */
function* days(seed = 1): Generator<Leg[]> {
  // Boundary-directed: evening transfers to a further zone, many legs.
  for (const pass of PASSES) {
    for (const start of [18 * 60 + 50, 19 * 60 + 10, 20 * 60, 22 * 60]) {
      const legs: Leg[] = [];
      let minute = start;
      for (let j = 0; j < 14; j++) {
        legs.push({ zones: 1 + (j % 4), minuteOfDay: Math.min(minute, 1439), pass });
        minute += 20;
      }
      yield legs;
    }
  }

  let state = seed;
  const next = (n: number): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % n;
  };
  for (let i = 0; i < 200; i++) {
    const count = 1 + next(8);
    const legs: Leg[] = [];
    let minute = next(300);
    for (let j = 0; j < count; j++) {
      minute += 5 + next(400);
      legs.push({
        zones: 1 + next(4),
        minuteOfDay: Math.min(minute, 1439),
        pass: PASSES[next(PASSES.length)] ?? "full",
      });
    }
    yield legs;
  }
}

export function check(tariff: Tariff = DEFAULT_TARIFF): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<InvariantId>();
  const record = (f: Finding): void => {
    if (seen.has(f.rule)) return;
    seen.add(f.rule);
    findings.push(f);
  };

  for (const legs of days()) {
    const { perLeg, total } = chargeDay(legs, tariff);

    // I1 — no journey is CHARGED above the daily cap. The accumulator's own view is
    // not the property: a path that charges a leg without accumulating it leaves the
    // total looking compliant while the rider pays past the cap, which is exactly the
    // failure this invariant exists to catch.
    const chargedTotal = perLeg.reduce((a, b) => a + b, 0);
    if (Math.max(total, chargedTotal) > tariff.dailyCapCents) {
      record({
        path: "src/rules/cap.ts",
        line: 18,
        rule: "I1",
        remediation: "update-cap-accumulator",
        detail: `charged ${String(chargedTotal)} against a cap of ${String(tariff.dailyCapCents)} (accumulator reported ${String(total)}); a charged leg bypassed the accumulator`,
      });
    }

    // I2 — a transfer inside the window is never charged a second BASE fare.
    // A zone upgrade is a difference and is permitted; a full boarding is not.
    for (let i = 1; i < legs.length; i++) {
      const prev = legs[i - 1]!;
      const cur = legs[i]!;
      const inWindow = cur.minuteOfDay - prev.minuteOfDay <= tariff.transferWindowMinutes;
      if (inWindow && (perLeg[i] ?? 0) >= baseFare(tariff, cur.zones)) {
        record({
          path: "src/rules/transfer.ts",
          line: 28,
          rule: "I2",
          remediation: "apply-transfer-credit",
          detail: `leg ${String(i)} was inside the transfer window and still paid ${String(perLeg[i])}`,
        });
      }
    }

    // I5 — the day total is the sum of the legs, capped.
    const summed = perLeg.reduce((a, b) => a + b, 0);
    if (summed !== total) {
      record({
        path: "src/fare.ts",
        line: 16,
        rule: "I5",
        remediation: "reconcile-day-total",
        detail: `sum of legs ${String(summed)} does not equal reported total ${String(total)}`,
      });
    }
  }

  // I3 — a reduced fare never exceeds the equivalent full fare.
  for (let zones = 1; zones <= tariff.baseByZone.length; zones++) {
    const full = baseFare(tariff, zones);
    for (const pass of PASSES) {
      if (applyReduction(tariff, full, pass) > full) {
        record({
          path: "src/rules/reduced.ts",
          line: 5,
          rule: "I3",
          remediation: "clamp-reduced-to-full",
          detail: `reduced fare for ${pass} at ${String(zones)} zones exceeds the full fare ${String(full)}`,
        });
      }
    }
  }

  // I4 — fares are non-negative and non-decreasing in zones crossed.
  for (let zones = 1; zones <= tariff.baseByZone.length; zones++) {
    const fare = baseFare(tariff, zones);
    const previous = zones > 1 ? baseFare(tariff, zones - 1) : 0;
    if (fare < 0 || fare < previous) {
      record({
        path: "src/rules/zones.ts",
        line: 5,
        rule: "I4",
        remediation: "order-zone-table",
        detail: `base fare at ${String(zones)} zones (${String(fare)}) is negative or below ${String(previous)}`,
      });
    }
  }

  return findings;
}
