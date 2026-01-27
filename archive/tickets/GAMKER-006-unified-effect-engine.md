# GAMKER-006: Unified Effect Engine for Actions and Triggers

## Status
Completed (January 27, 2026)

## Goal
Implement a shared effect executor for variable effects so action validation and trigger execution reuse the same logic, with runtime safety aligned to the current kernel scope.

## Rationale
- The DSL defines a broad `Effect` surface (move/spawn/destroy/reveal/hide/random/foreach), but the kernel currently applies only variable effects.
- Triggers and action validation should reuse the same effect executor to avoid divergence.
- `specs/validation-safety.md` calls for runtime safeguards, but the current kernel only enforces trigger loop detection by state change; the executor should respect that current scope.

## Scope
- Add a shared effect executor module in `src/game-kernel/` used by action validation and trigger execution.
- Support variable effects (`set`, `inc`, `dec`) with optional bounds handling for action validation.
- Treat non-variable effects as no-ops for now (documented and explicit), deferring token/zone behavior until the kernel gains token effect execution.
- Preserve existing trigger loop detection (state-change check) without introducing new recursion or step counters.
- Update `actions.js` and `triggers.js` to use the shared executor.

## Out of scope
- Token/zone effect execution (`move`, `spawn`, `destroy`, `reveal`, `hide`, `random`, `foreach`) and related zone ordering/visibility logic.
- New action legality rules or scheduling changes.
- Rich event logging or analytics.
- UI/event stream formatting.

## File list it expects to touch
- `src/game-kernel/effects.js`
- `src/game-kernel/effects.d.ts`
- `src/game-kernel/actions.js`
- `src/game-kernel/actions.d.ts`
- `src/game-kernel/triggers.js`
- `src/game-kernel/triggers.d.ts`
- `test/game-kernel/effects.test.mjs`
- `test/game-kernel/actions.test.mjs` (as needed)
- `test/game-kernel/scheduler.test.mjs` (as needed)

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/game-kernel/effects.test.mjs`
- `node --test test/game-kernel/actions.test.mjs`
- `node --test test/game-kernel/scheduler.test.mjs`

### Invariants that must remain true
- Effect application is deterministic for identical inputs and RNG seeds.
- Variable effects obey bounds handling for action validation (`reject` vs `clamp`).
- Trigger safeguards enforce the existing state-change loop detection.

## Test plan (first pass)
- Variable effects still work via the shared executor (set/inc/dec).
- Action validation retains bounds behavior (reject vs clamp) when routed through the shared executor.
- Trigger effects still apply and loop detection fires when no state change occurs.

## References
- `specs/game-kernel.md`
- `specs/validation-safety.md`
- `archive/specs/dsl.md`

## Outcome
- Added a shared variable-effect executor (`effects.js`) and refactored actions/triggers to use it.
- Added focused tests for shared effect behavior and bounds handling.
- Deferred token/zone effects and new recursion/step safeguards until token execution is implemented.
