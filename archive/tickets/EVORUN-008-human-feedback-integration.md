# EVORUN-008: Human feedback capture and preference updates

## Goal

Wire optional human feedback into the runner: respect the `humanFeedback` config gate, persist feedback logs, and ensure preference model snapshots are written per generation. The runner should rely on callers to supply feedback (for example via `src/human-interface/feedback.js`) rather than owning prompt IO.

## Revised assumptions

- There is no `feedback-loop` module. Feedback is currently injected via `EvolutionRunnerOptions.feedback`.
- Prompt assembly lives in `src/human-interface/feedback.js`; the runner should not perform interactive IO.
- Preference model snapshots are already persisted by the runner via `writeGenerationArtifacts`.

## File list (expected to touch)

- `src/evolution-runner/runner.js`
- `src/evolution-runner/runner.d.ts`
- `test/unit/evolution-runner/runner.test.mjs`

## Out of scope

- Changes to the simulation engine.
- New UI beyond terminal prompts.
- Altering fitness blending formulas.

## Acceptance criteria

### Tests

- `node --test test/unit/evolution-runner/runner.test.mjs`
- `npm run test:unit`

### Invariants

- Feedback capture is strictly optional and gated by `config.humanFeedback.enabled`.
- Feedback logs are written to the current run and generation only.
- Preference model snapshots are versioned and tied to the same run ID.

## Status

Completed (2026-01-28).

## Outcome

- Implemented config-gated feedback persistence in the evolution runner and added unit coverage.
- Kept prompt IO and feedback assembly in `src/human-interface/feedback.js` as a caller responsibility (no new feedback-loop module).
