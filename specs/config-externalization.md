# Config Externalization Plan

## Purpose

Move hardcoded configuration values into data-driven JSON config files organized by subsystem, then update architecture docs to reference those files and defaults. This spec defines the target config structure, invariants, and required tests. No code changes are included here.

## Scope

- Externalize configuration currently embedded in code or described as defaults in architecture docs.
- Keep configs organized by subsystem; do not mix unrelated concepts.
- Preserve current runtime behavior and determinism with default configs.
- Update `docs/architecture/*` to reflect the new config sources and defaults.

## Non-Goals

- Changing runtime behavior or algorithms.
- Migrating runtime data formats (except annotating config versions in new files and docs).
- Introducing non-JSON formats unless required later (YAML/TOML out of scope for this spec).

## Current Observations (from architecture docs)

These are the main config-like values currently described as defaults or embedded behavior:

- Simulation engine: `maxTurns`, `maxSteps`, loop detection (`maxRepeatedStates`),
  no-legal-actions policy defaults, RNG seed usage, agent selection behavior.
- Metrics and fitness: degeneracy thresholds, metric enablement + parameters
  (meaningful choice, comeback potential, skill expression), feature ordering,
  scoring weights, preference blending and caps, diversity pressure defaults.
- Human feedback + preference model: rating range, comparison choices,
  active learning thresholds, preference model hyperparameters (learning rates,
  caps, history length, weighting).
- Evolutionary engine: MAP-Elites descriptor configs, shortlist size, fitness
  comparison/tiebreak, mutation/repair operator toggles or parameters.
- Runner: run directory layout, resume compatibility checks (config version,
  descriptor set), determinism seed storage.

## Proposed Config Architecture

### High-Level Structure

Create a top-level `configs/` directory with JSON files grouped by subsystem. Example:

- `configs/simulation.json`
- `configs/metrics-core.json`
- `configs/metrics-extended.json`
- `configs/degeneracy.json`
- `configs/fitness.json`
- `configs/preference-model.json`
- `configs/active-learning.json`
- `configs/map-elites.json`
- `configs/evolution-operators.json`
- `configs/evolution-runner.json`
- `configs/human-feedback.json`

This separation keeps each file focused on a single conceptual surface area. Where a subsystem
needs to compose others (e.g., fitness uses preferences and diversity), the runtime merges
configs but does not rewrite or duplicate defaults.

### File Ownership and Responsibility

- Simulation engine reads `simulation.json` only.
- Metrics compute modules read `metrics-core.json`, `metrics-extended.json`.
- Degeneracy detector reads `degeneracy.json`.
- Fitness scorer reads `fitness.json` and references preference scoring only by key.
- Preference model reads `preference-model.json`.
- Active learning reads `active-learning.json`.
- MAP-Elites reads `map-elites.json`.
- Mutation/repair/crossover reads `evolution-operators.json`.
- Runner reads `evolution-runner.json` (including persistence layout, runId rules).
- Human interface reads `human-feedback.json`.

### Config Versioning

Each config file includes:

- `version`: integer schema version for the file.
- `updatedAt`: ISO-8601 string for tracking (optional but recommended).

Runner snapshots should persist a composite config fingerprint:

- `configVersion`: object with per-file versions and a stable hash of resolved config
  (used for resume compatibility).

## Config File Specifications (Draft)

Below are the proposed keys; actual JSON Schema definitions should live in `specs/` and
be referenced by loaders and documentation.

### `configs/simulation.json`

- `version`
- `maxTurns` (integer, optional)
- `maxSteps` (integer, optional)
- `loopDetection.enabled` (boolean, default false if absent)
- `loopDetection.maxRepeatedStates` (integer)
- `turn.noLegalActions.policy` (`terminate | pass | error | stalemate`) and
  `turn.noLegalActions.reason` (string, optional)
- `rng`:
  - `seed` (integer or string, optional)
  - `algorithm` (`lcg32` default, for documentation only)

### `configs/metrics-core.json`

- `version`
- `enabled` (list of metric ids or map of id -> boolean)
- `normalization` (object; non-finite policy defaults to 0)
- `featureOrder` (list, optional; default is current ordering)

### `configs/metrics-extended.json`

- `version`
- `meaningfulChoice.enabled`
- `meaningfulChoice.decisionSamplesPerRun`
- `meaningfulChoice.rolloutsPerAction`
- `meaningfulChoice.rolloutMaxSteps`
- `meaningfulChoice.maxRolloutsPerRun`
- `meaningfulChoice.rolloutAgent`
- `meaningfulChoice.seed`
- `comebackPotential.enabled`
- `comebackPotential.earlyStepPercent`
- `skillExpression.enabled`
- `skillExpression.matchesPerSeat`
- `skillExpression.seed`
- `skillExpression.maxTurns` (optional passthrough)
- `skillExpression.maxSteps` (optional passthrough)

### `configs/degeneracy.json`

- `version`
- `thresholds`:
  - `loop.repeatedStateRatio`
  - `loop.minRepeatedStates`
  - `forcedMove.ratio`
  - `dominantAction.ratio`
  - `dominantAction.minSamples`
  - `trivialWin.winRate`
  - `trivialWin.maxAvgSteps`
- `flags` (list of enabled degeneracy flags)
- `rejectOn` (list of flags to reject)

### `configs/fitness.json`

- `version`
- `weights` (map of feature id -> weight)
- `objectives` (optional list if objectives are used)
- `weightNormalization` (boolean)
- `diversityPressure`
- `diversityWeight`
- `preferenceWeight`
- `preferenceCap`
- `preferenceBootstrapSamples`
- `preferenceBootstrapCap`

### `configs/preference-model.json`

- `version`
- `learningRate`
- `maxHistory`
- `comparisonWeight`
- `ratingWeight`
- `weightDecay`
- `maxWeightAbs`
- `maxBiasAbs`

### `configs/active-learning.json`

- `version`
- `uncertaintyThreshold`
- `diversityQuota`

### `configs/map-elites.json`

- `version`
- `descriptors`: array of descriptor configs (id, min, max, bins)
- `fitnessKey` (optional)
- `tieBreak` (`replace | keep`, default same as current)
- `compareFitness` (optional flag for custom comparison)

### `configs/evolution-operators.json`

- `version`
- `mutation.enabled` (list of operator ids)
- `mutation.weights` (optional weight map)
- `crossover.enabled` (list of operator ids)
- `repair.enabled` (list of operator ids)

### `configs/evolution-runner.json`

- `version`
- `runsRoot` (default `runs`)
- `artifacts` layout (filenames and subpaths)
- `resume` compatibility checks: `requireConfigMatch` (boolean),
  `requireDescriptorMatch` (boolean)

### `configs/human-feedback.json`

- `version`
- `rating.min` (default 1)
- `rating.max` (default 5)
- `comparison.choices` (default `["A","B","Tie"]`)
- `promptText` overrides (optional for CLI messaging)

## Invariants

These must remain true after externalization:

- Default behavior with default config files matches current behavior.
- Determinism is preserved for identical seeds and configs.
- Validation errors are raised for invalid configs (e.g., invalid descriptor bins).
- Feature vector ordering remains deterministic; weights are keyed by id.
- Resume checks prevent mixing incompatible runs unless explicitly allowed.

## Documentation Updates Required

Each architecture document in `docs/architecture/` must be updated to:

- Replace hardcoded defaults with references to the relevant config file.
- State the config file path and key names for each configurable value.
- Clarify the default values in the config files (not embedded in prose).
- Document the override policy (allowed CLI overrides with persistence and
  compatibility checks) wherever config loading or runner/resume behavior is
  described.

Specifically:

- `docs/architecture/simulation-engine.md`: reference `configs/simulation.json` for
  cutoffs, loop detection, no-legal-actions policy, RNG seed.
- `docs/architecture/metrics-and-fitness.md`: split config references across
  `metrics-core.json`, `metrics-extended.json`, `degeneracy.json`, `fitness.json`.
- `docs/architecture/human-feedback.md`: reference `human-feedback.json`,
  `active-learning.json`, `preference-model.json`.
- `docs/architecture/evolutionary-engine.md`: reference `map-elites.json`,
  `evolution-operators.json` for operator toggles and weights.
- `docs/architecture/evolution-runner.md`: reference `evolution-runner.json` for
  layout, resume rules, config matching, and override persistence.
- `docs/architecture/pipeline-overview.md`: link to config files per stage.
- `docs/architecture/README.md`: add a section listing config files and ownership.

## Tests and Verification

No new tests are added in this spec, but the following must pass after implementation:

- `npm run test:unit`.
- Existing `test/e2e/` remain stable with default configs.

Recommended new tests (future work):

- Unit tests for config validation per file (invalid fields, missing required keys).
- Unit tests for config loader merging and default handling.
- E2E test proving that custom config overrides change behavior in a controlled way
  (e.g., different `maxTurns` or degeneracy thresholds).

## Decisions (Resolved)

- Config files are discovered by convention under `configs/` (no single root file).
- Config layout in `configs/` is accepted as the primary organization.
- Per-run overrides are allowed only if they are persisted and validated as part
  of the run (see the next section).

## Per-Run Overrides (Recommended)

Recommendation: allow per-run overrides, but only when they are materialized into
the run artifacts and included in config compatibility checks.

Required behaviors:

- CLI overrides merge into the resolved config at run start.
- The resolved config and the override manifest are written under the run directory.
- `configVersion` fingerprint includes the resolved config (and/or override manifest).
- Resume requires a match on the resolved config unless explicitly overridden.
- Limit overrides to runtime knobs; structural changes (e.g., descriptor bins)
  should trigger a new run unless explicitly forced.

## Open Questions

- Do we need JSON Schema files colocated under `specs/` or `configs/schema/`?

## Next Steps

- Confirm file list and ownership boundaries.
- Decide on config loading strategy and schema locations.
- Update architecture docs after agreement on config layout.
