# SEEGEN-01: Replace runner config schema — add seeding block, remove version

## Summary

Remove `version` from the runner config. Replace `schemas/evolution-runner/runner-config.v1.json` with `schemas/evolution-runner/runner-config.schema.json`. Add a required `seeding` block with `mode` (generate/folder/mixed), `populationSize`, and sub-objects for folder, generate, and mix options. Update config validator and existing configs/tests.

## Files to touch

- `schemas/evolution-runner/runner-config.v1.json` — **delete**
- `schemas/evolution-runner/runner-config.schema.json` — **create** (new canonical schema)
- `src/evolution-runner/config.js` — change schema import path
- `configs/evolution-runner.json` — remove `version`, add `seeding` block
- `test/unit/evolution-runner/config.test.mjs` — update for new schema
- Any test fixtures referencing old runner config shape

## Out of scope

- Grammar generator implementation (SEEGEN-02)
- Folder seeding logic (SEEGEN-04)
- Runner behavioral changes (SEEGEN-05)
- CLI changes (SEEGEN-06)
- Implementing the actual seeding behavior (this ticket is schema-only)

## Acceptance criteria

### Tests that must pass
- `validateRunnerConfig()` rejects configs containing a `version` field
- `validateRunnerConfig()` accepts configs with valid `seeding` block and no `version`
- `seeding.mode` is required; must be `"generate"`, `"folder"`, or `"mixed"`
- `seeding.populationSize` is required; positive integer
- When `mode="folder"`, `seeding.folder.path` is required (string)
- When `mode="generate"`, `seeding.generate` is required (object with `coverage` and `grammar`)
- When `mode="mixed"`, both `folder` and `generate` required, plus `mix.folderFraction` (0-1)
- `seeding.generate.coverage` validates: `strategy` enum (`uniform-bins`|`underfilled-first`|`random`), `maxAttempts` (positive int), `fallback.strategy` enum
- `seeding.generate.grammar` validates: `limits` (object), `weights` (object)
- `additionalProperties: false` enforced at every level
- `npm run test:unit` passes
- `tsc -p tsconfig.json` passes

### Invariants
- No existing module outside of evolution-runner config breaks (schema change is isolated to config validation)
- Old configs with `version` are cleanly rejected with a clear validation error
