# EVORUN-001: Document evolution runner and run isolation

## Status

- Completed on 2026-01-28.

## Goal

Document the evolution runner responsibilities, run directory layout, and the rules for starting, resuming, and isolating independent evolution runs. Capture the UX expectation that users can choose an existing named run or start a new one, with auto-generated names when none are provided. The doc should align with `specs/evolution-runner.md` and note that the CLI is not yet implemented in `src/`.

## Assumptions

- There is no evolution runner CLI implementation in `src/` yet; this ticket is documentation-only.
- Data persistence modules already require `runId` for metrics and trajectory records; feedback records allow optional `runId`.
- Unit tests exist for core modules, but there are no runner-specific tests.

## File list (expected to touch)

- `docs/architecture/evolution-runner.md` (new)
- `docs/architecture/README.md`

## Out of scope

- Any changes to `src/` implementation files.
- CLI argument parsing or interactive prompts.
- JSON schema additions.
 - Adding new tests beyond running existing suites.

## Acceptance criteria

### Tests

- `npm run test:unit`

### Invariants

- Architecture docs continue to match existing engine behavior as described in `docs/architecture/evolutionary-engine.md`.
- The run isolation guarantee is explicit: populations, artifacts, and feedback never cross run boundaries unless the user explicitly resumes the same run. Isolation is described as a runner responsibility (directory segregation + `runId` tagging), not an engine-enforced invariant.

## Outcome

- Added architecture documentation for the evolution runner and updated the architecture index; no runtime code changes were needed because the runner is still a planned CLI described by `specs/evolution-runner.md`.
