# CONEXT-009: Update architecture overview docs for config ownership

## Status: COMPLETED

## Goal
Update the high-level architecture documentation to list config files per subsystem and link to ownership boundaries.

## Tasks
- [x] Add a config ownership section to `docs/architecture/README.md` listing each config file and its owning subsystem.
- [x] Update `docs/architecture/pipeline-overview.md` to link each pipeline stage to its config file(s).
- [x] Ensure docs reference config keys rather than embedding defaults in prose.

## File list (expected to touch)
- docs/architecture/README.md
- docs/architecture/pipeline-overview.md

## Out of scope
- Changes to subsystem docs (simulation, metrics, runner, etc.).
- Any code changes or schema updates.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit` — **272/272 pass**

### Invariants that must remain true
- Documentation references config files and keys as the source of defaults.
- Default behavior with default config files remains unchanged.

## Outcome

**What was changed:**
- `docs/architecture/README.md`: Added "Config File Ownership" section with a table mapping all 11 config files to their owning subsystem and architecture doc.
- `docs/architecture/pipeline-overview.md`: Added `Config:` lines to pipeline stages 2–8, plus a new stage 9 (Run orchestration) linking to `evolution-runner.json`.
- `test/unit/docs/config-ownership-docs.test.mjs`: New test file with 2 tests ensuring the README ownership table lists every config file and the pipeline overview references key configs.

**vs originally planned:** Exactly as planned. No ticket corrections were needed — all assumptions about existing files and docs were accurate. Added 2 doc-integrity tests (not originally scoped) to prevent drift between docs and config files.
