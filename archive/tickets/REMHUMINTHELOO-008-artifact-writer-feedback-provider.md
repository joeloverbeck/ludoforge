# REMHUMINTHELOO-008: Artifact writer + feedback provider update

**Status**: Completed
**Diff size**: L
**Depends on**: 001, 003, 006, 007

## Assumption corrections (assessed against codebase)

1. **`runner-initializer.js` already reads `config.preferenceLearning?.enabled`** (line 90). No changes needed — this was completed in a prior ticket (REMHUMINTHELOO-007).
2. **`adaptive-budget.js` already allows budget=0.** `normalizeBaseMaxSamples()` uses `Math.max(0, base)`. The spec's concern about a "hard minimum of 1" is already resolved.
3. **`create-feedback-provider.js`**: Currently extracts candidates from `loopResult.evaluated` directly via `extractCandidates()`. Wiring `resolveCandidatePool()` requires the provider to receive additional context (elites, shortlist, rng, candidatePoolConfig). This is scoped as an optional enhancement: when `candidatePoolConfig` is provided, use `resolveCandidatePool()`.

## What

1. Extend `writeGenerationArtifacts()` to write three new optional artifacts: `preference-controller.json`, `preference-health.json`, `taste-vector.json`.
2. Update `createFeedbackProvider()` to optionally accept `candidatePoolConfig` + pool context (`elites`, `shortlist`, `rng`) and use `resolveCandidatePool()` when provided, falling back to existing `extractCandidates()` behavior.

## Files to touch

- `src/evolution-runner/artifact-writer.js` — add `preferenceController`, `preferenceHealth`, `tasteVector` optional params; write 3 new JSON files
- `src/human-interface/create-feedback-provider.js` — accept optional `candidatePoolConfig` + pool context; use `resolveCandidatePool()` when configured
- `test/unit/evolution-runner/artifact-writer.test.mjs` — tests for new artifacts
- `test/unit/human-interface/create-feedback-provider-pool.test.mjs` — new test file for candidate pool wiring

## Out of scope

- `runner-initializer.js` changes (already done in 007)
- Full generation-body integration
- Resume support
- E2E tests
- Schema changes (separate ticket)
- `decideFeedbackPlan` / freeze controller logic (separate ticket scope from spec sections 1.2-1.3)

## Acceptance criteria

- [x] Tests: `writeGenerationArtifacts` writes `preference-controller.json`, `preference-health.json`, `taste-vector.json` when provided
- [x] Tests: `writeGenerationArtifacts` omits new artifacts when params are undefined
- [x] Tests: `createFeedbackProvider` works with `candidatePoolConfig` to use `resolveCandidatePool()`
- [x] Tests: `createFeedbackProvider` falls back to `extractCandidates()` when no pool config
- [x] Invariant: existing artifact-writer tests pass
- [x] Invariant: existing feedback-provider tests pass
- [x] Invariant: `tsc -p tsconfig.json` passes

## Outcome

### What was actually changed vs originally planned

**Originally planned:**
- Update `artifact-writer.js`, `create-feedback-provider.js`, `runner-initializer.js`
- New artifacts, new config shape, runner-initializer changes

**What actually changed:**
- `runner-initializer.js` was **not touched** — it already reads `config.preferenceLearning?.enabled` (done in REMHUMINTHELOO-007).
- `adaptive-budget.js` was **not touched** — it already allows budget=0 (done in REMHUMINTHELOO-002).
- `artifact-writer.js`: Added 3 new optional params (`preferenceController`, `preferenceHealth`, `tasteVector`) following the existing pattern for optional JSON artifacts. Each writes a corresponding JSON file when provided, is omitted when undefined, and rejects non-object values.
- `create-feedback-provider.js`: Added optional `candidatePoolConfig` param. When provided along with `loopResult.elites` and `loopResult.rng`, uses `resolveCandidatePool()` from `candidate-pool.js` (REMHUMINTHELOO-003) to resolve candidates before pair selection. Falls back gracefully to existing `extractCandidates()` when pool config or context is absent.
- Test file created: `test/unit/human-interface/create-feedback-provider-pool.test.mjs` (3 tests for pool wiring).
- Test file updated: `test/unit/evolution-runner/artifact-writer.test.mjs` (7 new tests for 3 artifacts).

**All 2381 unit tests pass. tsc passes.**
