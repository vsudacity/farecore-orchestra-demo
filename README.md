# farecore

A transit authority's fare-rules engine, and the repository the Release-Gate Orchestra operates on.

**This ships as provided starter code.** It assesses no learning objective — see `spec/PRD.md` §7.1.
Its job is to give every learner the *same* invariant violation to catch, so the reject-then-retry
demonstration is gradeable rather than dependent on whatever a model happened to produce that day.

## Invariants

The gate runs `tests/invariants.ts`. Five properties, over generated days rather than examples:

| id | property | remediation when violated |
|---|---|---|
| **I1** | no journey is charged above the daily cap | `update-cap-accumulator` |
| **I2** | a transfer inside the window is never charged a second base fare | `apply-transfer-credit` |
| **I3** | a reduced fare never exceeds the equivalent full fare | `clamp-reduced-to-full` |
| **I4** | fares are non-negative and non-decreasing in zones crossed | `order-zone-table` |
| **I5** | a day's total equals the sum of its legs, capped | `reconcile-day-total` |

Remediations are drawn from a closed set. A gate finding of "fix it" is not actionable and the schema
does not permit one.

## The seeded defect

Ticket: *senior discount not applied on transfers after 19:00*.

The report is real and the obvious fix is wrong in a way a reviewer would wave through: applying the
reduced-fare entitlement on the evening transfer path while returning before `accumulate` runs. The
reported case then passes and **I1** breaks, because a rider making many legs is charged past the cap.
This is the whole point of gating on invariants rather than on the reported symptom.
