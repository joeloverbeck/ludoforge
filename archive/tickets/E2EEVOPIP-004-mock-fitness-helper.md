# E2EEVOPIP-004: Add deterministic fitness helper

## Goal
Provide a deterministic fitness helper that produces stable fitness scores or vectors from evaluation artifacts.

## Assumptions (updated)
- No mock fitness helper exists yet; it will live in `test/e2e/helpers/mock-fitness.js`.
- The helper should leverage existing evaluation-analytics utilities without changing `src/` code.
- E2E helper coverage will be added via a focused test in `test/e2e/`.

## File list
- test/e2e/helpers/mock-fitness.js
- test/e2e/mock-fitness.e2e.test.mjs

## Out of scope
- Changes to production fitness computation in src/.
- Changes to analytics or preference-learning implementations.
- Modifying existing E2E test files beyond required imports.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/fixtures.e2e.test.mjs
- node --test test/e2e/mock-fitness.e2e.test.mjs

### Invariants that must remain true
- Fitness outputs are deterministic for fixed inputs.
- Degeneracy flags or safety violations can override preference scores when requested.
- Helper does not depend on wall-clock time or random system state.

## Status
- Completed on 2026-01-27.

## Outcome
- Added a deterministic mock fitness helper and E2E coverage for deterministic output plus gating behavior.
- No production evaluation-analytics behavior was changed (helper is test-only).
