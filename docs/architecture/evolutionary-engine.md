# Evolutionary Engine and MAP-Elites

## Evaluation Adapter

Implemented in `src/evolutionary-engine/evaluation-adapter.js`.

Steps per genome:

1. Optionally apply repair operators (defaults to none). If repair fails, the genome is rejected.
2. Validate DSL definition (`validateGameDefinition` + `validateSemanticDefinition`).
3. Run safety gates if provided.
4. Invoke `options.evaluator(genome)` with the repaired genome if repair ran.
5. Reject if evaluator output is missing `fitness` or `descriptors`.

Diagnostics include validation results, safety failures, and evaluator-specific payloads.

## MAP-Elites Placement

Implemented in `src/evolutionary-engine/map-elites.js`.

### Descriptor Binning

- Each descriptor maps to a bin index:
  - `normalized = (clamp(value, min, max) - min) / (max - min)`
  - `index = floor(normalized * bins)`
  - clamped into `[0, bins - 1]`.
- Descriptor configs are validated (finite numbers, `bins` is a positive integer,
  and `max > min`); invalid configs throw.

### Niche Id

- Coordinates are serialized as `descriptorId:bin` and joined by `|`.

### Elite Selection

- Per niche, choose the member with higher fitness.
- Supports optional `compareFitness` and `tieBreak = "replace"`.

## Generation Loop

Implemented in `src/evolutionary-engine/engine.js`.

- Evaluates each genome with the adapter.
- Places evaluated genomes into MAP-Elites.
- `nextGeneration` is all elites across niches.
- `shortlist` is an optional diversified subset of elites.

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
- `action-effect-magnitude`: nudges `inc`/`dec`/`random`/`foreach` effect amounts by +/-1.
- `precondition-negation`: wraps an action precondition with `not`.
- `termination-threshold`: nudges numeric termination thresholds within variable bounds.
- `termination-outcome`: swaps termination outcome types (`win`/`lose`/`draw`).
- `phase-add`: appends a unique phase label to `turn.phases`.
- `phase-remove`: removes a random phase when more than one exists.
- `token-zone-target-add`: clones a token type + zone and adds a matching action target.
- `token-type-remove`: removes a token type and rewrites references to a remaining token type.
- `zone-remove`: removes a zone and rewrites references to a remaining zone.
- Operator chosen uniformly at random (seedable RNG).

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
