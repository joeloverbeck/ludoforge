# OUTCONISS-001 Canonical SimulationResult Schema (Docs)

## Context
Define a single, normative SimulationResult contract (docs + implementation) to resolve the output mismatch around `outcome.reason` and the missing `terminated` field. Align simulation output, analytics summaries, and E2E claims with the canonical contract in `specs/output-contract-issues.md`.

## Scope
- Add a canonical SimulationResult section that is explicitly normative.
- Declare required fields, enums, and the hard rule banning `outcome.reason`.
- Update simulation output to include top-level `terminated` and optional `terminationDetail`.
- Ensure no-legal-actions termination uses `terminationReason = "no-legal-actions"` with `terminationDetail` when configured.
- Update analytics summaries/metrics to consume the canonical fields.
- Update relevant docs that reference the contract (E2E coverage and metrics).
- Update tests that assert the old shape and add coverage for the new invariants.

## File list
- docs/architecture/simulation-engine.md
- docs/architecture/e2e-coverage.md
- docs/architecture/metrics-and-fitness.md
- src/simulation-engine/loop.js
- src/simulation-engine/types.d.ts
- src/evaluation-analytics/log-adapter.js
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/degeneracy.js
- src/evaluation-analytics/types.ts
- test/unit/**/*
- test/e2e/**/*

## Out of scope
- No new persistence formats or schema files beyond documentation and type updates.
- No changes to unrelated gameplay logic or DSL validation rules.

## Acceptance criteria
### Behavior
- SimulationResult includes `terminated` at the top level.
- `outcome` is per-player only and does not include `reason` or `terminated`.
- `terminationReason` stays within: condition, stalemate, no-legal-actions, max-turns, max-steps, loop-detected.
- `terminationDetail` is used only for configured human-readable details (e.g., `turn.noLegalActions.reason`).
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Termination reasons remain limited to: condition, stalemate, no-legal-actions, max-turns, max-steps, loop-detected.
- Outcome remains per-player only and never carries a reason field.
- The new section is marked as the single source of truth for SimulationResult.
- Breaking change is explicit: SimulationResult.outcome no longer carries `reason`/`terminated`.

## Status
Completed (2026-01-28)

## Outcome
- Expanded from docs-only to include simulation output, analytics summaries, and tests.
- Implemented top-level `terminated` and `terminationDetail`, removing `outcome.reason` from the public contract.
