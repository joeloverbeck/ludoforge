# Spec: Refactor `src/simulation-engine/loop.js`

**Goal**: Reduce `loop.js` from 556 lines to ~310 lines by extracting four focused modules.

**Invariants**:
- Public API (`runSimulation`, `runRollout`) unchanged in signature and behavior
- All existing tests pass without modification
- Determinism preserved for same seed
- No new runtime dependencies

---

## Modules to Extract

### 1. `src/simulation-engine/simulation-defaults.js` (~85 lines)

**Responsibility**: Load and resolve simulation configuration defaults.

**Functions moved**:
| Function | Lines | Notes |
|----------|-------|-------|
| `formatValidationErrors` | 19–30 | Pure utility |
| `loadDefaultSimulationConfig` | 32–40 | Async config loader |
| `resolveOptionalNumber` | 44–46 | Pure utility |
| `resolveSimulationDefaults` | 48–100 | Config resolution |

**Top-level await** (line 42):
```js
const DEFAULT_SIMULATION_CONFIG = await loadDefaultSimulationConfig();
```
Stays in this new module. The constant is consumed only by `resolveSimulationDefaults`.

**Exports**:
```js
export { resolveSimulationDefaults };
```

Only `resolveSimulationDefaults` is needed by `loop.js`. The rest are internal to this module.

---

### 2. `src/simulation-engine/termination-outcome.js` (~70 lines)

**Responsibility**: Build termination and outcome objects from game state.

**Functions moved**:
| Function | Lines | Notes |
|----------|-------|-------|
| `buildDrawOutcome` | 134–140 | Constructs draw result |
| `resolveOutcomePlayers` | 142–156 | Resolves player list for outcome |
| `resolveDefaultOutcome` | 158–166 | Inverts outcome type |
| `buildTerminationOutcome` | 168–192 | Full termination with scores |
| `buildSimulationOutcome` | 194–199 | Extracts outcomes/scores |

**Imports required**:
```js
import { computeScoresAtState } from "../game-kernel/index.js";
```

**Exports**:
```js
export { buildDrawOutcome, buildTerminationOutcome, buildSimulationOutcome };
```

`resolveOutcomePlayers` and `resolveDefaultOutcome` are internal helpers — not exported.

---

### 3. `src/simulation-engine/step-execution.js` (~55 lines)

**Responsibility**: Apply actions, triggers, and build step records.

**Functions moved**:
| Function | Lines | Notes |
|----------|-------|-------|
| `cloneState` | 102–104 | Deep clone via JSON round-trip |
| `applyAction` | 215–229 | Applies costs then effects |
| `applyAfterActionTriggers` | 231–236 | Fires after-action triggers |
| `createStepImpact` | 238–240 | Creates empty impact tracker |
| `finalizeStepImpact` | 242–248 | Converts Set to sorted array |
| `buildStep` | 250–261 | Assembles step record |

**Imports required**:
```js
import {
  buildVariableIndex,
  applyEffect,
  applyTriggers,
} from "../game-kernel/index.js";
```

**Exports**:
```js
export {
  cloneState,
  applyAction,
  applyAfterActionTriggers,
  createStepImpact,
  buildStep,
};
```

`finalizeStepImpact` is internal — called only by `buildStep`.

---

### 4. `src/simulation-engine/loop-detection.js` (~20 lines)

**Responsibility**: State hashing and repeated-state tracking.

**Functions moved**:
| Function | Lines | Notes |
|----------|-------|-------|
| `defaultStateHasher` | 106–116 | Deterministic JSON hash |
| `recordLoopHash` | 202–213 | Tracks hash counts, detects loops |

**No external imports**.

**Exports**:
```js
export { defaultStateHasher, recordLoopHash };
```

---

## Retained in `loop.js` (~310 lines)

| Function | Lines | Reason |
|----------|-------|--------|
| `resolveAgent` | 118–132 | Loop-specific agent resolution |
| `runSimulationLoop` | 263–519 | Core orchestrator |
| `runSimulation` | 521–528 | Public export |
| `runRollout` | 530–556 | Public export |

**New imports in `loop.js`**:
```js
import { resolveSimulationDefaults } from "./simulation-defaults.js";
import { buildDrawOutcome, buildTerminationOutcome, buildSimulationOutcome } from "./termination-outcome.js";
import { cloneState, applyAction, applyAfterActionTriggers, createStepImpact, buildStep } from "./step-execution.js";
import { defaultStateHasher, recordLoopHash } from "./loop-detection.js";
```

**Removed imports from `loop.js`** (moved to extracted modules):
- `buildVariableIndex`, `applyEffect`, `applyTriggers`, `computeScoresAtState` — no longer used directly
- `loadConfigFile` — moved to `simulation-defaults.js`

**Kept imports in `loop.js`**:
```js
import {
  createInitialState,
  listLegalActions,
  validateActionChoice,
  advanceTurnPhase,
  createEventStream,
  recordStateUpdate,
  recordTermination,
  evaluateTermination,
} from "../game-kernel/index.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";
```

---

## New Unit Tests

### `test/unit/simulation-engine/termination-outcome.test.mjs`

| Test | Description |
|------|-------------|
| `buildDrawOutcome` returns draw for all players | Given 3-player definition, all outcomes are "draw" |
| `buildDrawOutcome` sets terminated true | Result has `terminated: true` |
| `resolveOutcomePlayers` handles "all" | Returns all player IDs |
| `resolveOutcomePlayers` handles "active" | Returns only active player |
| `resolveOutcomePlayers` handles array | Filters to valid integers |
| `resolveDefaultOutcome` inverts win/lose | "win" → "lose", "lose" → "win", other → "draw" |
| `buildTerminationOutcome` assigns outcomes correctly | Named players get outcome type, others get default |
| `buildTerminationOutcome` includes scores | Result contains `scores` from `computeScoresAtState` |
| `buildSimulationOutcome` extracts fields | Returns only `outcomes` and `scores` |

Note: `resolveOutcomePlayers` and `resolveDefaultOutcome` are not exported. Test them indirectly through `buildTerminationOutcome`, or temporarily export for unit testing via a `_testing` named export pattern.

### `test/unit/simulation-engine/step-execution.test.mjs`

| Test | Description |
|------|-------------|
| `cloneState` produces deep copy | Mutation of clone does not affect original |
| `applyAction` applies costs then effects | Costs and effects modify state in order |
| `applyAction` throws on cost failure | Error message includes "Action cost failed" |
| `applyAction` throws on effect failure | Error message includes "Action effect failed" |
| `applyAfterActionTriggers` calls applyTriggers | Delegates to game-kernel with "after_action" |
| `applyAfterActionTriggers` throws on failure | Error message includes "After-action triggers failed" |
| `createStepImpact` returns empty tracker | Has empty Set and false global flag |
| `buildStep` includes turn metadata | Step has turn, phase, playerId, actionId |
| `buildStep` includes cloned state | Step state is deep copy |
| `buildStep` finalizes impact | affectedPlayerIds is sorted array |

### `test/unit/simulation-engine/loop-detection.test.mjs`

| Test | Description |
|------|-------------|
| `defaultStateHasher` produces stable hash | Same state → same string |
| `defaultStateHasher` varies by player | Different currentPlayer → different hash |
| `defaultStateHasher` varies by variables | Different variables → different hash |
| `recordLoopHash` returns not-repeated first time | New hash → `{ repeated: false }` |
| `recordLoopHash` returns repeated after threshold | Hash seen > maxRepeatedStates → `{ repeated: true }` |
| `recordLoopHash` with null tracker | Returns `{ repeated: false }` |
| `recordLoopHash` uses custom hasher | Tracker's hasher function is called |

---

## Verification Criteria

After implementation:
1. `npm run test:unit` — all existing + new tests pass
2. `npm run test:e2e` — no regressions
3. `loop.js` < 320 lines
4. No circular dependencies between extracted modules
5. Each extracted module has zero coupling to `loop.js` internals
