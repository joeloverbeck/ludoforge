# Evolutionary Engine and MAP-Elites

## Evaluation Adapter

Implemented in `src/evolutionary-engine/evaluation-adapter.js`.

Steps per genome:

1. Optionally apply repair operators (defaults to none). If repair fails, the genome is rejected.
   Note: upstream in the mutation pipeline, `mutateAndRepairGenome` falls back to the
   original (pre-mutation) genome when repair returns `null`, so genomes are never
   silently dropped by the mutation-repair cycle. The evaluation adapter's rejection
   path applies only when the *adapter itself* runs repair and the result is `null`.
2. Validate DSL definition (`validateGameDefinition` + `validateSemanticDefinition`).
3. Run safety gates if provided.
4. Invoke `options.evaluator(genome)` with the repaired genome if repair ran.
   The default evaluator is produced by `createEvaluator()` from
   `src/evaluation-analytics/create-evaluator.js`, which runs the full 13-step
   built-in evaluation pipeline (see `docs/architecture/metrics-and-fitness.md`).
5. Reject if evaluator output is missing `fitness` or `descriptors`.

Diagnostics include validation results, safety failures, and evaluator-specific payloads.

## MAP-Elites Placement

Implemented in `src/evolutionary-engine/map-elites.js`.

### Descriptor ID Validation

Descriptor `id` values must be one of the known metric names:
`agency`, `strategic_depth`, `seat_imbalance`, `variety`, `pacing_tension`,
`turn_taking_rate`, `interaction_rate`, `structural_complexity`. This is enforced at two levels:

1. **Schema**: `MapElitesDescriptorConfig.id` is an `enum` in both
   `schemas/evolution-runner/runner-config.schema.json` and
   `schemas/config/map-elites.schema.json`.
2. **CLI runtime**: `src/cli/validate-descriptor-keys.js` checks descriptor IDs
   against `DEFAULT_FEATURE_ORDER` before the pipeline starts, producing a clear
   error listing unknown IDs and available metrics.

### Descriptor Binning

`binDescriptorValue(value, config)` returns a bin token:

- **In range** (`min <= value <= max`): integer bin index
  `floor((value - min) / (max - min) * bins)`, clamped to `[0, bins - 1]`.
- **Below range** (`value < min`): `"under"`.
- **Above range** (`value > max`): `"over"`.
- **Non-finite / null / undefined**: `"unknown"`.

Descriptor configs are validated (finite numbers, `bins` is a positive integer,
and `max > min`); invalid configs throw.

### Niche Id

Coordinates are serialized as `descriptorId:binToken` and joined by `|`.

Grammar:

- `segment := <descriptorId> ":" <binToken>`
- `nicheId := segment ("|" segment)*`
- `binToken := integer | "unknown" | "under" | "over"`

Examples: `agency:2|variety:1`, `agency:unknown|variety:0`, `agency:under|variety:over`.

### nonFiniteKeys Metadata

The evaluation pipeline tracks which metric values were non-finite before
normalization. `assembleFeatureVector()` returns `{ vector, nonFiniteKeys }`
where `nonFiniteKeys` lists metric ids whose raw values were `NaN`, `Infinity`,
`-Infinity`, `null`, or `undefined`. The built-in evaluator (Step 12) uses
`nonFiniteKeys` to set descriptor values to `null` for those keys, ensuring
they bin to `"unknown"` rather than being conflated with a real numeric bin.

### Elite Selection

- Per niche, choose the member with higher fitness.
- Supports optional `compareFitness` and `tieBreak = "replace"`.

## Generation Loop

Implemented in `src/evolutionary-engine/engine.js`.

- Evaluates each genome with the adapter.
- Places evaluated genomes into MAP-Elites.
- `nextGeneration` is all elites across niches.
- `shortlist` is an optional diversified subset of elites.

### Rejection Categorization

The generation loop categorizes every rejected genome into one of five reasons:

| Reason | Trigger |
|--------|---------|
| `repair-failure` | Repair operator returned `null` |
| `validation-failure` | DSL schema or semantic validation failed |
| `safety-failure` | One or more safety gates failed |
| `evaluation-error` | Evaluator returned an error diagnostic |
| `evaluation-null` | Evaluator returned `null` fitness/descriptors without an explicit error |

These categories are persisted in `rejected.jsonl` per generation and surfaced in
health metrics (see [evolution-runner.md](evolution-runner.md) § Health Metrics).

### Shortlist Selection

If `shortlistSize > 0`:

1. Rank elite placements by fitness, then RNG, then original index.
2. Seed the shortlist with the top candidate.
3. Iteratively choose the candidate with the max minimum coordinate distance
   to already selected members (ties break by fitness, RNG, then index).

## Mutation Operators

Implemented in `src/evolutionary-engine/mutation.js`.

- `numeric-tweak`: nudges integer initial values by +/-1 within `[min, max]`.
- `boolean-toggle`: flips boolean initial values.
- `enum-cycle`: changes enum initial values to a different allowed value.
- `action-duplicate`: duplicates a random action and assigns a unique id.
- `action-remove`: removes a random action when more than one exists.
- `action-effect-magnitude`: nudges `inc`/`dec` effect amounts by +/-1.
- `precondition-negation`: wraps an action precondition with `not`.
- `termination-threshold`: nudges numeric termination thresholds within variable bounds.
- `termination-outcome`: swaps termination outcome types (`win`/`lose`/`draw`).
- `phase-add`: appends a unique phase label to `turn.phases`.
- `phase-remove`: removes a random phase when more than one exists.
- `token-zone-target-add`: clones a token type + zone and adds a matching action target.
- `token-type-remove`: removes a token type and rewrites references to a remaining token type.
- `zone-remove`: removes a zone and rewrites references to a remaining zone.
- `effect-insert`: appends a random atomic effect to a random action's effects list.
- `effect-delete`: removes one effect from a random action with >=2 effects.
- `effect-param-tweak`: nudges a numeric effect parameter (`amount` or `value`) by +/-1.
- `effect-kind-swap`: replaces an effect's kind with a different valid kind, builds a new target appropriate for the new kind via `buildRefForKind`, and rebuilds its properties. Returns the genome unchanged if no valid target exists for the new kind.
- `effect-reorder`: swaps two effects within a random action's effects list.
- `action-add-small`: creates a new action with 1-2 random effects and a unique id.
- `motif-inject`: inserts a motif effect sequence into a random action. Ships with a default library of curated motifs (dec+inc, set+inc, inc+dec patterns); can also use mined motifs when motif mining is enabled.
- `zone-add`: adds a new zone referencing an existing token type with random scope, order, and visibility. No-op if no token types exist.
- `token-type-add`: adds a new token type with a single integer attribute and a companion zone. Works even when no token types exist yet.
- `trigger-add`: adds a trigger with a random event (`start_turn`, `end_turn`, `start_phase`, `end_phase`, `start_round`, `end_round`, `after_action`) and 1-2 random effects. No-op if no variables, token types, or zones exist.

### Operator Selection

Mutation operator selection is weighted when the runner orchestrates evolution.
The runner builds a `WeightedSelector` from `configs/evolution-operators.json`
(`mutation.weights`) and uses it to pick from the enabled operator list.

The selection abstraction is `OperatorSelector` (`pick(rng) → operatorName`,
`observe(name, outcome)`), allowing future strategies (bandits) without changing
core mutation operators.

### Differentiated Weights

Operator weights in `configs/evolution-operators.json` follow a three-tier scheme:

| Tier | Weight | Operators |
|------|--------|-----------|
| Conservative | 3 | `numeric-tweak`, `boolean-toggle`, `enum-cycle`, `action-effect-magnitude`, `precondition-negation`, `termination-threshold`, `termination-outcome`, `effect-param-tweak`, `zone-add`, `token-type-add`, `trigger-add` |
| Moderate | 2 | `action-duplicate`, `phase-add`, `token-zone-target-add`, `effect-insert`, `effect-kind-swap`, `effect-reorder`, `action-add-small`, `motif-inject` |
| Destructive | 0.5 | `action-remove`, `phase-remove`, `token-type-remove`, `zone-remove` |

`effect-delete` is weighted at 1 (between destructive and moderate).
The tiering ensures destructive removal mutations fire less frequently than
conservative value tweaks, reducing invalid-offspring rates.

### Structural Guards

Removal operators enforce structural minimum guards to prevent producing
empty definitions:

- `action-remove`: no-op when `actions.length <= 1`.
- `phase-remove`: no-op when `turn.phases.length <= 1`.
- `effect-delete`: no-op when the target action has fewer than 2 effects.
- `token-type-remove`: rewrites all references to a remaining token type.
- `zone-remove`: rewrites all references to a remaining zone.

These guards are inline within each operator, not in a separate validation pass.

### Adaptive Weighting

The `WeightedSelector` adjusts operator weights at runtime based on telemetry:

1. After each generation, the runner calls `mutationSelector.observe(telemetry)`.
2. For each operator, the failure rate is `(attempts - validOffspring) / attempts`.
3. If failure rate > 0.30, the weight is halved (clamped to a floor of 0.1).
4. If failure rate < 0.10, the weight is restored toward the base weight by 50%.
5. Weights between the thresholds remain unchanged.

Constants: `FAILURE_RATE_PENALIZE = 0.30`, `FAILURE_RATE_RESTORE = 0.10`,
`MIN_WEIGHT = 0.1`, `RESTORE_FACTOR = 0.5`.

Implemented in `src/evolutionary-engine/operator-selector.js`.

### Effect Helpers

Implemented in `src/evolutionary-engine/mutation/effect-helpers.js`:

- `EFFECT_KINDS`: canonical list of the 12 effect kinds used by mutation helpers,
  including `conditional` (see [simulation-engine.md](simulation-engine.md) for
  the full effect dispatch reference).
- `buildRandomEffect(definition, rng)`: generates a random effect with a valid
  target and properties drawn from the game definition.
- `buildRefForKind(kind, definition, rng)`: selects a target reference appropriate for
  the given effect kind (variable for set/inc/dec, token for move/spawn/destroy/
  move_spatial/set_flag, zone for reveal/hide). Returns `null` when the required
  structures are absent (e.g., no token types for a `move` kind), allowing callers
  to re-roll or skip the mutation.
- `buildEffectProps(kind, definition, rng)`: returns kind-specific properties (e.g.,
  `{ amount: 1 }` for inc/dec, `{ toZone }` for move/spawn, `{ zone, toNode }` for
  move_spatial, `{ flag, duration }` for set_flag, `{ count, effects }` for repeat).

## Crossover Operators

Implemented in `src/evolutionary-engine/crossover.js`.

- `subtree-swap`: swaps either `state.variables` or `actions` between parents,
  then re-validates the DSL.

## Repair Operators

Implemented in `src/evolutionary-engine/repair.js`.

- `dsl-safety` clamps invalid variable initial values to type bounds.
- Rejects genomes when variable or token type repair cannot be applied.
- Repair is limited to DSL safety (static fixes). Runtime degeneracy and playability
  issues are handled by simulation + degeneracy filters rather than repair.

### Structural Minimums

The `dsl-safety` repair operator rejects genomes (returns `null`) when structural
invariants are violated after repair:

- **Actions ≥ 1**: at least one action must exist.
- **Effects ≥ 1**: at least one action must have a non-empty effects array.
- **Termination ≥ 1**: at least one termination condition must exist.
- **Zones ≥ 1** (conditional): if any effect references a zone, at least one zone
  must exist.

These guards prevent downstream simulation and evaluation from encountering
structurally empty definitions.

### Reference Validation

The `dsl-safety` repair rewrites dangling references introduced by mutation or
crossover:

- **Variable refs**: `repairEffect` redirects `target.kind === "var"` refs whose
  `id` is absent from the definition to the first remaining variable (or drops the
  effect if none exist).
- **Token type refs**: spawn effects targeting a missing token type are redirected
  to the first remaining token type, with invalid attribute references removed.
- **Zone refs**: zone-target effects and `toZone` fields are redirected to the
  first remaining zone.
- **Precondition refs**: action preconditions referencing missing variables are
  removed (delete the precondition rather than the action).
- **Spatial node refs**: `move_spatial` effects targeting missing zones or nodes
  are redirected to the first valid spatial zone/node.

## Configuration Files

All evolutionary engine modules load validated defaults at module init via
`loadConfigFile` from `src/config/loader.js`. Caller parameters always override
config defaults.

### `configs/map-elites.json`

| Key | Type | Description |
|-----|------|-------------|
| `descriptors` | array | Descriptor axes with `id`, `min`, `max`, `bins` |
| `fitnessKey` | string \| null | Property name for keyed fitness objects |
| `tieBreak` | `"keep"` \| `"replace"` | How ties are resolved in niche placement |

Exported as `DEFAULT_MAP_ELITES_CONFIG` from `map-elites.js`.

### `configs/evolution-operators.json`

| Key | Type | Description |
|-----|------|-------------|
| `mutation.enabled` | string[] | Mutation operator names to include |
| `mutation.weights` | object | Per-operator weights (required, finite > 0) |
| `crossover.enabled` | string[] | Crossover operator names to include |
| `repair.enabled` | string[] | Repair operator names to include |

Loaded once via `operator-config.js` and shared by `orchestrator.js`,
`crossover.js`, and `repair.js`. Each module filters its hardcoded operator
registry by the corresponding `enabled` list.

### Override Policy

Caller parameters always take precedence over config-loaded defaults:
- `engine.js` receives MAP-Elites config from its caller (`options.mapElites`)
- `mutateGenome`, `crossoverGenome`, `repairGenome` accept `operators` in options
- When callers omit these options, modules fall back to config-filtered defaults
