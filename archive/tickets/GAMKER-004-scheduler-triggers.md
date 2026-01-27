# GAMKER-004: Turn/Phase Scheduler and Trigger Loop Detection

Status: Completed (2026-01-27)

## Goal
Implement the core turn/phase scheduler step and add trigger loop detection safeguards.

## Revalidated assumptions (2026-01-27)
- There is no existing scheduler or trigger module; `src/game-kernel/` only exposes `state` and `actions`.
- The codebase uses `.js` modules with paired `.d.ts` files (not `.ts` in `src/game-kernel/`).
- There are no existing scheduler tests; new coverage will live under `test/game-kernel/`.

## Scope
- Add a round-robin turn/phase scheduler step that advances one phase at a time.
- Apply `start_phase` and `end_phase` triggers around phase transitions.
- Detect trigger loops that re-fire without state change and terminate with an error result.
- Enforce a max-turn failsafe via `termination.maxTurns` or an explicit override.
- Trigger effects are limited to variable effects (`set`/`inc`/`dec`) until token/zone effects land.

## File list it expects to touch
- `src/game-kernel/scheduler.js`
- `src/game-kernel/scheduler.d.ts`
- `src/game-kernel/triggers.js`
- `src/game-kernel/triggers.d.ts`
- `src/game-kernel/index.js`
- `src/game-kernel/index.d.ts`
- `test/game-kernel/scheduler.test.mjs`

## Out of scope
- Action cost/effect application
- Outcome evaluation or scoring
- Rich logging/event stream formats

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/game-kernel/scheduler.test.mjs`

### Invariants that must remain true
- Max-turn failsafe terminates deterministically at the same turn count for identical inputs.
- Trigger loop detection only fires when there is no state change across trigger iterations.
- Phase advancement order is stable and documented.

## Outcome
- Added round-robin scheduler + trigger handling in new JS modules and exports.
- Trigger loop detection is single-pass: if triggers fire without state change, it errors immediately.
- Effects support is limited to variable updates; token/zone effects remain deferred.
