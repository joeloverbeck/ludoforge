# MUTREF-002: Extract random and value-tweak helpers

## Goal
Move random helpers and value-tweak helpers into dedicated modules while keeping the public API unchanged.

## Scope
- Create `src/evolutionary-engine/mutation/random.js` and `src/evolutionary-engine/mutation/value-tweaks.js`.
- Move the existing helper implementations into those modules.
- Update `src/evolutionary-engine/mutation.js` to import from the new modules while keeping it as the public entry point.

## File list it expects to touch
- `src/evolutionary-engine/mutation.js`
- `src/evolutionary-engine/mutation/random.js`
- `src/evolutionary-engine/mutation/value-tweaks.js`

## Out of scope
- Moving operator implementations.
- Any logic changes to RNG usage or tweak math.
- Adding new tests unless refactor work exposes an uncovered invariant.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-randomness.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- `getRandomIndex`, `pickDifferentValue`, and `createUniqueId` behavior is unchanged.
- `tweakIntValue` and `tweakNonNegative` behavior is unchanged.
- Existing import paths from `src/evolutionary-engine/mutation.js` still work.
- Helper functions remain internal (not exported) as they are today.

## Status
Completed on 2026-01-28.

## Outcome
- Moved random/value tweak helpers into dedicated modules and wired `mutation.js` to import them.
- Kept `mutation.js` as the public entry point; no helper exports were added, matching the existing API.
