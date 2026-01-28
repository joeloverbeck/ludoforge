# Mutation Module Refactor Spec

## Overview
The current `src/evolutionary-engine/mutation.js` is a large, multi-purpose module that mixes:
- selection/collection of mutation targets
- random helpers and value tweaks
- AST/selector traversal and reference updates
- mutation operator implementations
- top-level orchestration of operator selection and repair

This spec proposes a single-responsibility refactor that splits these concerns into focused modules without changing behavior or public API.

## Goals
- Preserve behavior, randomness, and default operator selection semantics.
- Make each mutation operator easy to read, test, and change in isolation.
- Centralize shared traversal/update logic (expressions, selectors, effects, actions, triggers).
- Provide deterministic testing hooks via RNG injection.
- Prepare for future operators with minimal boilerplate.

## Non-Goals
- Changing the mutation outcomes or probabilities.
- Altering the genome schema or repair logic.
- Introducing new operator types beyond structural refactoring.
- Converting JS to TS as part of this change.

## Current Responsibilities (to separate)
1. Random helpers and value tweaks
2. Target collection (variables/actions/effects/zones/tokenTypes)
3. Reference update traversal (expr/selector/effect/action/triggers)
4. Operator implementations (14 operators)
5. Orchestration (default list + mutateGenome + mutateAndRepairGenome)

## Proposed Module Layout
Create a folder `src/evolutionary-engine/mutation/` and split as follows. File names are suggestions; keep public exports in the existing top-level entry to avoid breaking imports.

- `src/evolutionary-engine/mutation/index.js`
  - re-export operators and orchestration functions
  - keeps API surface identical to current `mutation.js`

- `src/evolutionary-engine/mutation/random.js`
  - `getRandomIndex`
  - `pickDifferentValue`
  - `createUniqueId`
  - note: all RNG usage stays compatible with `rng.nextInt` and fallback to `Math.random`

- `src/evolutionary-engine/mutation/value-tweaks.js`
  - `tweakIntValue`
  - `tweakNonNegative`

- `src/evolutionary-engine/mutation/targets.js`
  - `collectVariableTargets`
  - `collectActionTargets`
  - `collectActionEffectTargets`
  - `collectZoneTargets`
  - `collectTokenTypeTargets`

- `src/evolutionary-engine/mutation/traversal.js`
  - `updateExpr`
  - `updateSelector`
  - `updateEffect`
  - `updateAction`
  - `updateTriggers`

- `src/evolutionary-engine/mutation/ref-updaters.js`
  - `updateRefTokenType`
  - `updateRefZone`

- `src/evolutionary-engine/mutation/operators/*.js`
  - one file per operator, e.g.:
    - `numeric-tweak.js`
    - `boolean-toggle.js`
    - `enum-cycle.js`
    - `action-duplicate.js`
    - `action-remove.js`
    - `action-effect-magnitude.js`
    - `precondition-negation.js`
    - `termination-threshold.js`
    - `termination-outcome.js`
    - `phase-add.js`
    - `phase-remove.js`
    - `token-zone-target-add.js`
    - `token-type-remove.js`
    - `zone-remove.js`

- `src/evolutionary-engine/mutation/orchestrator.js`
  - `defaultMutationOperators`
  - `mutateGenome`
  - `mutateAndRepairGenome`

## Public API (unchanged)
The following exports remain available from `src/evolutionary-engine/mutation.js` (or an equivalent top-level module that replaces it):
- each operator (by name)
- `defaultMutationOperators`
- `mutateGenome`
- `mutateAndRepairGenome`

## Refactor Principles
- Single Responsibility: each module does one kind of work.
- Command-Query Separation: helpers return values or mutate in-place, but do not mix both unless already required by current behavior.
- Behavior Preservation: no behavior changes; no schema changes.
- Minimize shared mutable state; use explicit inputs/outputs.

## Migration Strategy (phased)
1. Move pure helpers into modules and re-export from current entry.
2. Move traversal/update helpers, ensure tests cover tree walking semantics.
3. Move operators into individual modules and keep a central export list.
4. Move orchestration logic, wire to existing `repairGenome`.
5. Keep `src/evolutionary-engine/mutation.js` as a thin re-export until dependents are updated.

## Integration Test Requirements
Integration tests must exist or be added in `test/integration/` for each refactor area. The goal is to ensure behavior parity across module boundaries.

### Test Matrix
Each entry defines the integration test needed before or during refactor.

1. Random and value tweaks
- Test: `test/integration/mutation-randomness.test.mjs`
- Coverage: `getRandomIndex`, `tweakIntValue`, `tweakNonNegative`, `pickDifferentValue`
- Assertions: deterministic with seeded RNG; bounds respected; no negative results for non-negative tweaks

2. Target collection
- Test: `test/integration/mutation-targets.test.mjs`
- Coverage: `collectVariableTargets`, `collectActionTargets`, `collectActionEffectTargets`, `collectZoneTargets`, `collectTokenTypeTargets`
- Assertions: correct target counts/indices for mixed definitions and missing/empty structures

3. Traversal and reference updates
- Test: `test/integration/mutation-traversal.test.mjs`
- Coverage: `updateExpr`, `updateSelector`, `updateEffect`, `updateAction`, `updateTriggers`, `updateRefTokenType`, `updateRefZone`
- Assertions: all expected references updated; no updates on unrelated refs; attribute pruning for token refs

4. Operator behavior
- Test: `test/integration/mutation-operators.test.mjs`
- Coverage: each operator returns a valid mutated definition or no-op; RNG determinism
- Assertions: specific invariants per operator (see below)
  - numeric-tweak: int initial changes within min/max
  - boolean-toggle: bool initial toggles
  - enum-cycle: initial changes to different value
  - action-duplicate: new action inserted with unique id
  - action-remove: action count decreases when > 1
  - action-effect-magnitude: amount non-negative and adjusted by 1
  - precondition-negation: preconditions wrapped in not
  - termination-threshold: cmp right value tweaked within bounds
  - termination-outcome: outcome type changes within {win, lose, draw}
  - phase-add/phase-remove: phase list changes with min 1
  - token-zone-target-add: adds tokenType, zone, and target with consistent ids
  - token-type-remove: removes type and rebinds refs/zones
  - zone-remove: removes zone and rebinds refs/effects

5. Orchestration
- Test: `test/integration/mutation-orchestrator.test.mjs`
- Coverage: `defaultMutationOperators`, `mutateGenome`, `mutateAndRepairGenome`
- Assertions: selects an operator; respects empty operator list; repair pipeline invoked (mock or spy)

## Data Fixtures
Add representative genome fixtures in `test/integration/fixtures/` to cover:
- multiple variable types (int, bool, enum)
- actions with costs/effects/targets/preconditions
- zones and tokenTypes with attributes
- termination conditions and scoring
- triggers and turn.stepEffects

## Risks and Mitigations
- Risk: accidental behavior change in traversal logic. Mitigation: integration tests for deep refs and selectors.
- Risk: order-sensitive mutations when arrays are rebuilt. Mitigation: tests assert ordering preserved.
- Risk: mismatch in RNG usage after refactor. Mitigation: deterministic RNG fixture in tests.

## Open Questions
- Should `mutation.js` remain as the canonical entry point or should callers be migrated to `mutation/index.js`?
- Do we want unit tests per operator in addition to integration tests?

## Acceptance Criteria
- All integration tests in `test/integration/` pass.
- No consumer-facing API changes.
- Behavior parity demonstrated by tests for each refactor area.

## Outcome
- Orchestration now lives in `src/evolutionary-engine/mutation/orchestrator.js` with the public API preserved via `src/evolutionary-engine/mutation.js`.
- Added `test/integration/mutation-orchestrator.test.mjs` to cover operator selection, empty operator handling, and repair wiring.
