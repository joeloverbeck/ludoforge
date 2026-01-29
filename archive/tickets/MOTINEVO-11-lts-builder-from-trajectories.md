# MOTINEVO-11: LTS builder from trajectories

## Description
Create a new module `src/evaluation-analytics/lts-builder.js` that constructs a Labelled Transition System (LTS) from simulation trajectories. The `buildLts(trajectories)` function takes an array of trajectory step arrays and returns `{ nodes, edges }` where nodes are unique `stateHash` strings and edges are `{ from, to, label }` with canonical labels derived from `appliedEffects`.

## Files to Touch
- `src/evaluation-analytics/lts-builder.js` (new)

## Out of Scope
- Motif mining — handled in MOTINEVO-12
- Persistence — handled in MOTINEVO-12
- Evolution integration — handled in MOTINEVO-13

## Acceptance Criteria

### Tests That Must Pass
- Two trajectories with overlapping states (shared stateHash values) merge into a single LTS with deduplicated nodes
- Edge labels are deterministic: same `appliedEffects` produce same canonical label string
- Pass steps (empty `appliedEffects`) produce self-loop edges
- Output is deterministic: same input always produces same `{ nodes, edges }`
- `buildLts([])` returns `{ nodes: [], edges: [] }`
- `npm run test:unit` passes

### Invariants That Must Remain True
- `buildLts` is a pure function (no side effects, no mutation of input)
- Node deduplication is based solely on `stateHash` equality
- Edge deduplication accounts for `from`, `to`, and `label` together
- Function handles single-step trajectories correctly

## Dependencies
- Depends on: MOTINEVO-06
- Blocks: MOTINEVO-12

## Outcome
**Status**: Completed

**Files created**:
- `src/evaluation-analytics/lts-builder.js` — exports `canonicalLabel(appliedEffects)` and `buildLts(trajectories)`
- `test/unit/evaluation-analytics/lts-builder.test.mjs` — 15 tests covering all acceptance criteria

**Verification**:
- `node --test test/unit/evaluation-analytics/lts-builder.test.mjs` — 15/15 pass
- `npm run test:unit` — 452/452 pass, 0 regressions
