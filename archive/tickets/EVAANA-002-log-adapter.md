# [EVAANA] EVAANA-002: Build simulation log adapter to trajectory summaries

Status: Completed

## Goal
Translate simulation logs into normalized trajectory summaries that downstream metrics can consume safely.

## File list (expected to touch)
- src/evaluation-analytics/log-adapter.js
- src/evaluation-analytics/log-adapter.d.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/log-adapter.test.mjs

## Scope
- Define a narrow, versioned input shape for simulation logs that the adapter accepts.
- Convert logs into the trajectory summary types defined in `src/evaluation-analytics/types.ts`.
- Normalize counts (e.g., action counts), terminal signals, and step metadata currently modeled in `TrajectorySummary`.
- Validate required fields and return explicit, typed errors for malformed input.

## Out of scope
- No changes to simulation engine logging or log emitters.
- No metric computation or degeneracy filtering.
- No persistence or file IO.
- No branching-factor series or win-probability timelines until types are defined for them.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/evaluation-analytics/log-adapter.test.mjs`

### Invariants that must remain true
- Adapter output is deterministic for identical inputs.
- Adapter never mutates input objects.
- Existing simulation-engine tests in `test/simulation-engine/` continue to pass.

## Notes
- Keep parsing logic small and pure; separate validation from transformation for testability.

## Outcome
- Delivered a versioned log adapter that validates inputs and emits trajectory summaries with action counts, key steps, and terminal signals.
- Deferred branching-factor series and win-probability timelines because no corresponding types exist yet.
