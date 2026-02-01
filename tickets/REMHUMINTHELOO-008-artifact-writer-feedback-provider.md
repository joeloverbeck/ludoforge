# REMHUMINTHELOO-008: Artifact writer + feedback provider update

**Status**: Open
**Diff size**: L
**Depends on**: 001, 003, 006, 007

## What

Extend `writeGenerationArtifacts()` to write three new artifacts. Update `createFeedbackProvider()` to accept new config shape and use `resolveCandidatePool()`. Update `runner-initializer.js` to read `preferenceLearning` instead of `humanFeedback`.

## Files to touch

- `src/evolution-runner/artifact-writer.js` — add `preferenceController`, `preferenceHealth`, `tasteVector` params; write 3 new JSON files
- `src/human-interface/create-feedback-provider.js` — read `preferenceLearning` config; use `resolveCandidatePool()`; accept external budget
- `src/evolution-runner/runner-initializer.js` — `config.preferenceLearning?.enabled` replaces `config.humanFeedback?.enabled`; initialize controller state
- `test/unit/evolution-runner/artifact-writer.test.mjs` — tests for new artifacts
- `test/unit/human-interface/create-feedback-provider.test.mjs` — update for new config shape

## Out of scope

Full generation-body integration. Resume support. E2E tests.

## Acceptance criteria

- Tests: `writeGenerationArtifacts` writes `preference-controller.json`, `preference-health.json`, `taste-vector.json`
- Tests: `createFeedbackProvider` works with `preferenceLearning` config
- Tests: `runner-initializer` reads `preferenceLearning.enabled`
- Invariant: existing artifact-writer tests pass
- Invariant: `tsc -p tsconfig.json` passes
