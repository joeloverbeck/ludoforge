# CONEXT-008: Wire evolution runner config and resume checks

## Goal
Use `configs/evolution-runner.json` for run layout, artifacts, and resume compatibility, and persist config fingerprints in run artifacts.

## Tasks
- Load `configs/evolution-runner.json` in the runner.
- Apply `runsRoot`, artifacts layout, and resume compatibility flags.
- Persist resolved config and override manifest in run artifacts.
- Include `configVersion` (per-file versions + fingerprint) in run metadata.
- Update `docs/architecture/evolution-runner.md` with config references, key names, and override policy.

## File list (expected to touch)
- src/evolution-runner/config.js
- src/evolution-runner/run-layout.js
- src/evolution-runner/artifact-writer.js
- src/evolution-runner/resume-loader.js
- src/evolution-runner/runner.js
- docs/architecture/evolution-runner.md

## Out of scope
- Changes to evolutionary engine logic.
- CLI UX changes beyond config plumbing.
- Schema or config file structure changes beyond the defined keys.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Resume checks prevent mixing incompatible runs unless explicitly allowed.
- Determinism is preserved for identical seeds and configs.
- Validation errors are raised for invalid configs.
