# Evolutionary Engine and MAP-Elites

## Evaluation Adapter

Implemented in `src/evolutionary-engine/evaluation-adapter.js`.

Steps per genome:

1. Optionally apply repair operators (defaults to none). If repair fails, the genome is rejected.
   Note: upstream in the mutation pipeline, `mutateAndRepairGenome` returns a structured
   outcome (`{ genome, operatorName, outcome }`) where `outcome` is one of `"ok"`,
   `"noOp"`, or `"repairFailed"`. When repair returns `null`, the outcome is
   `"repairFailed"` and the genome field is `null` — the runner retries with a
   different operator rather than evaluating the original genome. The evaluation
   adapter's rejection path applies only when the *adapter itself* runs repair and
   the result is `null`.
2. Validate DSL definition (`validateGameDefinition` + `validateSemanticDefinition`).
3. Run safety gates if provided.
4. `await options.evaluator(genome, context)` with the repaired genome if repair ran.
   The evaluator is async — it returns a Promise. An optional `context` object
   (currently `{ logger }`) is threaded from the generation loop through the
   adapter to the evaluator. The default evaluator is produced by
   `createEvaluator()` from `src/evaluation-analytics/create-evaluator.js`,
   which runs the full 13-step built-in evaluation pipeline (see
   `docs/architecture/metrics-and-fitness.md`).
5. Reject if evaluator output is missing `fitness` or `descriptors`. When the
   evaluator returns invalid output, diagnostics include the returned `fitness`
   value and whether `descriptors` was present, aiding debugging.

Diagnostics include validation results, safety failures, and evaluator-specific payloads.

## MAP-Elites Placement

Implemented in `src/evolutionary-engine/map-elites.js`.

### Descriptor ID Validation

Descriptor `id` values must be one of the known metric names:
`agency`, `strategic_depth`, `seat_imbalance`, `variety`, `pacing_tension`,
`turn_taking_rate`, `interaction_rate`, `structural_complexity`,
`advantage_reversal_rate`, `policy_sensitivity`, `skipped_effect_rate`.
This is enforced at two levels:

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
- `nextGeneration` starts as all elites across niches, then is backfilled with
  non-elite evaluated genomes (sorted by fitness descending) up to the input
  population size. This parent preservation prevents single-generation population
  collapse when MAP-Elites fills fewer niches than the input population size.
  Deduplication uses genome `id` to avoid including elites twice.
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
- `phase-remove`: removes a random phase when more than one exists. After
  removal, rebinds any actions whose `metadata.phase` matched the removed
  phase to a random remaining phase (or removes the phase metadata entirely
  if no phases remain).
- `token-zone-target-add`: clones a token type + zone and adds a matching action param (with `domain.selector`).
- `token-type-remove`: removes a token type and rewrites references to a remaining token type.
- `zone-remove`: removes a zone and rewrites references to a remaining zone.
- `effect-insert`: appends a random atomic effect to a random action's effects list.
- `effect-delete`: removes one effect from a random action with >=2 effects.
- `effect-param-tweak`: nudges a numeric effect parameter (`amount` or `value`) by +/-1.
- `effect-kind-swap`: replaces an effect's kind with a different valid kind, builds a new target appropriate for the new kind via `buildRefForKind`, and rebuilds its properties. Returns the genome unchanged if no valid target exists for the new kind.
- `effect-reorder`: swaps two effects within a random action's effects list.
- `action-add-small`: creates a new action with 1-2 random effects and a unique id. ~20% chance to include a `dec` cost referencing an int variable (created on-demand via `pickOrCreateVariable` if none exist).
- `action-cost-add`: adds a cost to a random action. Builds from three weighted pools: `dec` (spend resource variable, weight 3), `destroy` (sacrifice token, weight 1), `move` (relocate token between zones, weight 1). Falls back to `dec` when `move` pool has no eligible token types, and no-ops when no cost pools are available.
- `action-cost-remove`: removes a random cost from an action that has costs. Deletes the `costs` property entirely when the last cost is removed. No-op when no actions have costs.
- `action-cost-tweak`: tweaks a `dec` cost amount by +/-1 or +/-2 (clamped to min 1).
- `motif-inject`: inserts a motif effect sequence into a random action. Ships with a default library of curated motifs (dec+inc, set+inc, inc+dec patterns). When motif mining is enabled, the runner dynamically replaces this operator each generation with a fresh instance created via `createMotifInjectMutation(minedMotifEffects)`, using DSL effect sequences discovered from elite trajectory analysis.
- `trigger-add`: adds a trigger with a random event (`start_turn`, `end_turn`, `start_phase`, `end_phase`, `start_round`, `end_round`, `after_action`, `state_change`, `threshold`) and 1-2 random effects. `threshold` triggers include a condition expression comparing a variable to a threshold value. Uses `pickOrCreateVariable` to obtain or create an int variable for threshold conditions.
- `trigger-remove`: removes a random trigger from the definition. No-op when no triggers exist.
- `trigger-edit`: picks a random trigger and applies one of: event swap (to any of the 9 DSL-supported events), condition add/remove/mutate, or effect insert/delete/reorder. Uses `pickOrCreateVariable` for threshold conditions. No-op when no triggers exist.
- `variable-remove`: removes one variable (preserving at least 1). Rewrites all dangling variable refs in action effects, preconditions, trigger conditions, termination conditions, and `turn.orderBy.variable`. Redirects refs to a compatible remaining variable; replaces unrewritable expression subtrees with `{ kind: "value", value: false }`. No-op with ≤1 variables.
- `variable-scope-toggle`: flips a random variable's scope between `global` and `per_player`. No-op with 0 variables.
- `termination-add`: generates a new termination condition referencing an int variable (created on-demand via `pickOrCreateVariable` if none exist) with a reachable threshold (greater than initial, within bounds), plus a random outcome (`win`/`lose`/`draw`). Creates the `termination` section if missing.
- `termination-remove`: removes one termination condition, never reducing below 1. No-op with exactly 1 or 0 conditions.
- `termination-condition-mutate`: applies one of: comparator swap, variable ref swap, constant adjustment (+/-1 within bounds), wrap with `not`, or unwrap existing `not`. No-op when no termination conditions exist.
- `scheduler-swap`: changes `turn.scheduler` to a different type (`round_robin`, `priority_queue`, `token_holder`, `reactive`, `simultaneous`, `random_draw`). Generates required auxiliary fields (`orderBy` for priority_queue; `tokenType` + `zone` for token_holder; `resolution.order` for simultaneous) from existing definition state, and strips fields that are no longer relevant. `reactive`, `round_robin`, and `random_draw` require no auxiliary fields. No-op only when no valid swap target exists (e.g., the only excluded candidates are priority_queue without per-player int vars, or token_holder without matching per-player zones).
- `scheduler-param-tweak`: tweaks parameters of the current scheduler without changing type. For `priority_queue`: flips `direction` (`asc`/`desc`) or swaps `variable` to a different per-player int variable. For `token_holder`: swaps `tokenType` or `zone` to a different valid option. For `simultaneous`: flips `resolution.order` between `by_player_id` and `random`. No-op for `round_robin`, `reactive`, and `random_draw` (no parameters to tweak).
- `conditional-effect-insert`: wraps an existing effect from a random action in a `conditional` block. The `then` branch contains the original effect, and the condition is a `cmp` expression comparing a game variable (obtained via `pickOrCreateVariable`) to a random threshold. No-op when no actions have effects.
- `turn-order-effect-insert`: inserts a `set_turn_order` effect into an `end_round` trigger. Creates the trigger if none exists. References a per-player integer variable (created on-demand via `pickOrCreateVariable` if none exist) with random direction (`asc`/`desc`).
- `choose-effect-insert`: wraps an existing action effect in an `rng_choose` block with two options: the original effect and a randomly generated alternative. No-op when no actions have effects.
- `worker-count-tweak`: adjusts the `count` field on `spawn` effects found in triggers or action effect lists by ±1, clamped to min 1. Defaults missing `count` to 1 before tweaking. No-op when no spawn effects exist.

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
| Conservative | 3 | `numeric-tweak`, `boolean-toggle`, `enum-cycle`, `action-effect-magnitude`, `precondition-negation`, `termination-threshold`, `termination-outcome`, `effect-param-tweak`, `trigger-add` |
| Moderate | 2 | `action-duplicate`, `phase-add`, `token-zone-target-add`, `effect-insert`, `effect-kind-swap`, `effect-reorder`, `action-add-small`, `action-cost-tweak`, `motif-inject`, `termination-condition-mutate`, `worker-count-tweak` |
| Structural | 1–1.5 | `scheduler-swap` (1), `scheduler-param-tweak` (1.5), `conditional-effect-insert` (1.5), `turn-order-effect-insert` (1.5), `choose-effect-insert` (1.5), `trigger-edit` (1.5), `action-cost-add` (1.5), `effect-delete` (1), `variable-scope-toggle` (1), `termination-add` (1) |
| Destructive | 0.5 | `action-remove`, `phase-remove`, `token-type-remove`, `zone-remove`, `trigger-remove`, `variable-remove`, `termination-remove`, `action-cost-remove` |

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
- `trigger-remove`: no-op when no triggers exist.
- `variable-remove`: no-op when `state.variables.length <= 1`. Rewrites all dangling refs.
- `termination-remove`: no-op when `termination.conditions.length <= 1`.

These guards are inline within each operator, not in a separate validation pass.

### Adaptive Weighting

The `WeightedSelector` adjusts operator weights at runtime based on telemetry:

1. After each generation, the runner calls `mutationSelector.observe(telemetry)`.
2. For each operator, the inefficiency rate is
   `(attempts - validEvaluated) / attempts`, where `validEvaluated` counts only
   mutated genomes that produced valid fitness + descriptors (not fallback/no-op
   genomes).
3. If inefficiency rate > 0.30, the weight is halved (clamped to a floor of 0.1).
4. If inefficiency rate < 0.10, the weight is restored toward the base weight by 50%.
5. Weights between the thresholds remain unchanged.

Constants: `FAILURE_RATE_PENALIZE = 0.30`, `FAILURE_RATE_RESTORE = 0.10`,
`MIN_WEIGHT = 0.1`, `RESTORE_FACTOR = 0.5`.

Implemented in `src/evolutionary-engine/operator-selector.js`.

### Structured Mutation Outcomes

`mutateAndRepairGenome()` (in `src/evolutionary-engine/mutation/orchestrator.js`)
returns a structured outcome when an `OperatorSelector` is provided:

| Outcome | `genome` field | Meaning |
|---------|---------------|---------|
| `"ok"` | mutated genome | Mutation + repair succeeded |
| `"noOp"` | original genome | Operator made no change (structural guard, missing prerequisites) |
| `"repairFailed"` | `null` | Mutation applied but repair returned `null` |

A selector is always required. The runner builds one via `createMutationSelector()`
at startup; missing or invalid operator weights cause an immediate startup error.

If the selector picks an operator name that does not match any operator in the
list, the orchestrator throws an `Error` immediately (fail-fast) rather than
silently returning an unmutated clone.

### Pick-or-Create Helpers

Implemented in `src/evolutionary-engine/mutation/pick-or-create.js`.

Many mutation operators need a zone, token type, or variable to reference. Instead
of standalone add operators (`zone-add`, `token-type-add`, `variable-add` — now
removed), the codebase uses **pick-or-create** helpers that either select an
existing element or create a new one on-demand with a configurable probability.
This ensures newly created elements are always immediately wired into an effect,
condition, or cost — they are never orphaned.

- `pickOrCreateZone(definition, rng)`: returns an existing zone or creates a new
  one (with a random token type, scope, order, and visibility) and appends it to
  `definition.state.zones`. Returns `null` only when no token types exist and
  creation is impossible.
- `pickOrCreateTokenType(definition, rng)`: returns an existing token type or
  creates one (with a single int attribute and a companion zone) and appends it
  to `definition.state.tokenTypes` and `definition.state.zones`.
- `pickOrCreateVariable(definition, rng, options?)`: returns an existing variable
  (optionally filtered by `{ kind, scope }`) or creates a new int variable and
  appends it to `definition.state.variables`. An optional `filter` narrows the
  pick pool (e.g., `{ kind: "int", scope: "per_player" }`).

Creation probabilities are configured in `configs/evolution-operators.json` under
`pickOrCreate`:

| Element | Default probability | Config key |
|---------|-------------------|------------|
| Zone | 0.10 | `pickOrCreate.zone` |
| Token type | 0.10 | `pickOrCreate.tokenType` |
| Variable | 0.15 | `pickOrCreate.variable` |

These helpers are used by `buildRefForKind`, `buildEffectProps`, and directly by
operators that need specific element types (e.g., `termination-add` needs an int
variable, `turn-order-effect-insert` needs a per-player int variable).

### Effect Helpers

Implemented in `src/evolutionary-engine/mutation/effect-helpers.js`:

- `EFFECT_KINDS`: canonical list of the 15 effect kinds used by mutation helpers:
  `set`, `inc`, `dec`, `move`, `spawn`, `destroy`, `reveal`, `hide`,
  `move_spatial`, `repeat`, `set_flag`, `conditional`,
  `shuffle`, `queue_push`, `queue_pop`.
  See [simulation-engine.md](simulation-engine.md) for the full effect dispatch reference.
- `buildRandomEffect(definition, rng)`: generates a random effect with a valid
  target and properties drawn from the game definition.
- `buildRefForKind(kind, definition, rng)`: selects or creates a target reference
  appropriate for the given effect kind (variable for set/inc/dec via
  `pickOrCreateVariable`, token for move/spawn/destroy/move_spatial/set_flag via
  `pickOrCreateTokenType`, zone for reveal/hide/shuffle via `pickOrCreateZone`,
  token for queue_push). Returns `null` for queue_pop (uses `fromZone` prop instead).
  Because pick-or-create can synthesize missing elements, `null` returns are rare
  (only when creation is structurally impossible).
- `buildEffectProps(kind, definition, rng)`: returns kind-specific properties (e.g.,
  `{ amount: 1 }` for inc/dec, `{ toZone, toPlayer? }` for move, `{ toZone }` for
  spawn, `{ zone, toNode, distance? }` for move_spatial, `{ flag, duration }` for set_flag,
  `{ count, effects }` for repeat, `{ toZone }` for queue_push, `{ fromZone }` for queue_pop).
  Zone-requiring props use `pickOrCreateZone` instead of direct random selection.

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
- The repair orchestrator (`orchestrator.js`) also repairs `definition.turn.stepEffects`
  by running `repairEffects()` on each step-effect entry.
- The repair orchestrator repairs termination outcome `players` fields via
  `repairTerminationOutcomes()` from `src/evolutionary-engine/repair/termination-repair.js`.
  Valid values are `"all"`, `"active"`, or an array of non-negative integers. Invalid
  values (e.g., `"inactive"`) are reset to `"active"`.
- `unused-element-prune` (implemented in `src/evolutionary-engine/repair/unused-prune.js`)
  removes unused zones, token types, and variables after mutation/crossover. Uses
  `collectUsedIds()` from `src/dsl/semantic/used-id-collector.js` to walk the
  definition (actions, triggers, termination, turn config) and identify all
  referenced element IDs. Elements not in the used set are pruned, with cascading:
  zones whose `tokenType` was pruned are also removed. Safety guards keep at least
  one element of each type. This repair acts as a safety net against genome bloat
  from element creation (via pick-or-create), removals that orphan references, and
  crossover that introduces unreferenced elements.

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
- **Trigger condition refs**: trigger conditions referencing missing variables
  (checked via `exprReferencesMissingVariable`) are stripped, making the
  trigger unconditional rather than removing it entirely.
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
