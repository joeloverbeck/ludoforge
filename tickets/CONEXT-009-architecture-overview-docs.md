# CONEXT-009: Update architecture overview docs for config ownership

## Goal
Update the high-level architecture documentation to list config files per subsystem and link to ownership boundaries.

## Tasks
- Add a config ownership section to `docs/architecture/README.md` listing each config file and its owning subsystem.
- Update `docs/architecture/pipeline-overview.md` to link each pipeline stage to its config file(s).
- Ensure docs reference config keys rather than embedding defaults in prose.

## File list (expected to touch)
- docs/architecture/README.md
- docs/architecture/pipeline-overview.md

## Out of scope
- Changes to subsystem docs (simulation, metrics, runner, etc.).
- Any code changes or schema updates.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Documentation references config files and keys as the source of defaults.
- Default behavior with default config files remains unchanged.
