# MOTINEVO-13: Motif-aware evolution operators

## Description
Implement 7 new mutation operator files and register them in the mutation pipeline:
1. `effect-insert` — insert a new effect into an action
2. `effect-delete` — remove an effect from an action
3. `effect-param-tweak` — tweak numeric parameters of an existing effect
4. `effect-kind-swap` — change an effect's kind to another valid kind
5. `effect-reorder` — reorder effects within an action
6. `action-add-small` — add a minimal new action to a phase
7. `motif-inject` — inject a mined motif pattern into a genome

All operators must produce valid genomes that pass DSL schema validation.

## Files to Touch
- `src/evolutionary-engine/mutation/operators/effect-insert.js` (new)
- `src/evolutionary-engine/mutation/operators/effect-delete.js` (new)
- `src/evolutionary-engine/mutation/operators/effect-param-tweak.js` (new)
- `src/evolutionary-engine/mutation/operators/effect-kind-swap.js` (new)
- `src/evolutionary-engine/mutation/operators/effect-reorder.js` (new)
- `src/evolutionary-engine/mutation/operators/action-add-small.js` (new)
- `src/evolutionary-engine/mutation/operators/motif-inject.js` (new)
- `src/evolutionary-engine/mutation/mutation.js` (register new operators)

## Out of Scope
- Motif mining implementation — done in MOTINEVO-12
- Config schema — done in MOTINEVO-09
- Existing operator modifications (except registration)

## Acceptance Criteria

### Tests That Must Pass
- Each operator produces a genome that passes DSL JSON Schema validation
- Each operator preserves genome `id` uniqueness (generates new id)
- Each operator handles edge cases (no effects to delete, single effect to reorder, etc.)
- **T5**: Running evolution with effect-level operators enabled generates valid children across 10+ generations with seeded RNG
- `motif-inject` correctly applies a motif pattern from the motif store
- All operators follow the existing operator interface/signature conventions
- `npm run test:unit` passes

### Invariants That Must Remain True
- No mutation of input genomes (immutability preserved)
- All operators use seeded RNG for determinism
- Operator registration in `mutation.js` follows existing patterns
- Operators are composable with existing crossover operators

## Dependencies
- Depends on: MOTINEVO-09, MOTINEVO-12
- Blocks: none
