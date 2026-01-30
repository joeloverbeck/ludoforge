# Simulation Engine Methodology

## Entry Points

- `runSimulation(config)` in `src/simulation-engine/loop.js` executes a single playthrough.
- `createSimulationEngine(config)` in `src/simulation-engine/index.js` wraps the same loop.

## Configuration

Defaults are loaded from `configs/simulation.json` (validated by `schemas/config/simulation.schema.json`).
Per-run values passed to the entry points override file defaults, and explicit
`definition.turn.noLegalActions` values remain authoritative over config defaults.

Config keys used by the simulation engine:

- `maxTurns`, `maxSteps`
- `loopDetection.enabled`, `loopDetection.maxRepeatedStates`
- `turn.noLegalActions.policy`, `turn.noLegalActions.reason`
- `rng.seed` (numeric only), `rng.algorithm` (documentation only; `lcg32`)

## State Initialization

- A fresh state is created from the game definition: `createInitialState(definition)`.
- The trajectory starts empty and accumulates per-step snapshots and events.

## Agent Selection

- Agents are normalized from the config via `normalizeAgents`.
- Selection logic:
  - First, match the active player id.
  - Next, match the active player's role.
  - Finally, fall back to positional ordering.

## Action Resolution

Per step:

1. List legal actions (`listLegalActions`).
2. Build meta (`legalActionCount`, `hasLegalActions`) for termination evaluation.
3. Evaluate termination conditions (`evaluateTermination`) with meta.
4. If terminated, stop and return the outcome.
5. If no legal actions exist, apply the `turn.noLegalActions` policy:
   - `terminate`: return the configured default outcome with
     `terminationReason = "no-legal-actions"` and `terminationDetail` set to the
     configured reason (if provided).
   - `pass`: record a pass step (`actionId = null`) and advance the turn/phase.
   - `error`: throw a structured error.
   - unset: default to stalemate draw.
6. Ask the active agent for an action id or action object.

The effective `turn.noLegalActions` policy is taken from the game definition when set;
otherwise it falls back to `configs/simulation.json`.
7. Validate action legality (`validateActionChoice`). This includes resolving
   action target selectors — if a target selector finds no matching tokens, the
   action is rejected.
8. Resolve action targets (`resolveActionTargets` from `selectors.js`) to bind
   abstract target names to concrete token instance IDs. Bindings are passed
   into the effect context so effects can reference targets by binding name.
9. Apply action costs, then action effects (`applyEffect`). Effect dispatch
   handles variable effects (`set`/`inc`/`dec`), token lifecycle effects
   (`spawn`/`move`/`destroy`/`reveal`/`hide`), spatial movement
   (`move_spatial`), repeat wrappers (`repeat`), conditional wrappers
   (`conditional`), and scoped flags (`set_flag`).
   Cost effects are applied with `boundsMode: "reject"` — if any cost fails
   (e.g., decrementing a variable already at its minimum), the entire action
   is aborted: `applyAction` returns `{ appliedEffects: [], skippedEffects,
   costAborted: true }` with no state mutation. This is a safety net; cost
   feasibility is already checked during legality (step 1) so cost failures
   should not be reachable in normal play.
   Non-cost effects that fail are **skipped** rather than throwing —
   `applyAction` collects skipped effects with their reason and source
   (`"cost"` or `"effect"`) and returns them alongside applied effects. This
   allows structurally complex genomes to survive evaluation even when some
   effects target non-existent structures.
10. Clear action-scoped flags (`clearFlags(state, "action")`).
11. Apply after-action triggers (`applyAfterActionTriggers`). If a trigger
    fails, it is recorded as a `skippedTrigger` rather than throwing, and
    successfully applied trigger effects are still returned.
12. Record state update in the event stream.
13. Persist the step snapshot (turn, phase, player, action, legalActionCount).

No-legal-actions handling never prompts the agent. The pass policy does not run
after-action triggers because no action occurred.

### Simultaneous Scheduler Flow

When `definition.turn.scheduler === "simultaneous"` the loop changes:

- All players select actions during the same phase before any effects resolve.
- Resolution order comes from `turn.resolution.order`:
  - `by_player_id` (default): 1 → 2 → … → N
  - `random`: shuffled per turn using the simulation RNG (seeded when provided)
- Each resolved action still records its own step snapshot, triggers, and
  termination checks.

## Turn Advancement and Cutoffs

- `advanceTurnPhase` controls phase cycling and player selection.
- Supported schedulers (`definition.turn.scheduler`):
  - `round_robin`: cycles players 1 → 2 → … → N → 1. Round increments when
    player wraps back to player 1. If `state.turn.turnOrder` is set (by a
    `set_turn_order` effect), players cycle in that custom order instead of
    the default 1…N sequence.
  - `priority_queue`: selects the player with the min (or max) value of a
    per-player variable specified by `definition.turn.orderBy`. Tie-breaking:
    lowest player ID wins. Round increments when every player has completed at
    least one turn (tracked via an internal `_actedThisRound` Set).
  - `token_holder`: selects the player who holds a token of type
    `definition.turn.tokenType` in per-player zone `definition.turn.zone`.
    Tie-breaking: lowest player ID wins if multiple players hold matching
    tokens. Round increments when every player has completed at least one turn
    (tracked via `_actedThisRound`).
  - `simultaneous`: all players act each turn; phases advance in order, and
    rounds increment every time phases wrap. Resolution order is controlled by
    `turn.resolution.order`.
  - `random_draw`: selects a player uniformly at random using the seeded RNG
    each turn. RNG flows from `loop.js` → `advanceAndCheck` → `advanceTurnPhase`
    via `options.rng`. Round increments when every player has acted at least once
    (tracked via `_actedThisRound`).
- Phase cycling is shared: within a multi-phase turn, phases advance sequentially
  before the scheduler picks the next player.
- If `maxTurns` is exceeded, termination reason is `"max-turns"` and the outcome is computed
  via `evaluateTermination` with `maxTurnsReached: true`.
  `maxTurns` defaults to `configs/simulation.json` if not provided per run.

## Loop Detection

- Optional loop tracking uses a state hasher to detect repeated states.
- The default hasher records variables, tokens, zones, and turn metadata.
- If repetitions exceed `maxRepeatedStates`, termination reason is `"loop-detected"`.
  Loop detection defaults come from `configs/simulation.json` when enabled.

## Determinism

- `createSeededRng(seed)` uses a 32-bit LCG:
  - `state = (1664525 * state + 1013904223) >>> 0`.
  - `next()` returns `state / 2^32`.
- Providing a seed makes simulation reproducible across runs; `rng.seed` in
  `configs/simulation.json` is used only when no per-run seed or RNG is provided.

## Seed Derivation

Implemented in `src/simulation-engine/seed-derivation.js`.

`deriveSeed(baseSeed, ...components)` deterministically derives a 32-bit unsigned
integer from a base seed and an arbitrary sequence of string or number components
using FNV-1a hashing:

- Initializes hash to the FNV offset basis (`2166136261`).
- Processes `baseSeed` as 4 little-endian bytes.
- For each component: numbers are converted to 4 little-endian bytes; strings
  are processed as 2-byte-per-character sequences (low byte then high byte).
- Each byte is folded into the hash via `(hash ^ byte) * 16777619` using
  `Math.imul` for 32-bit multiplication.
- Returns `hash >>> 0` (non-negative uint32).

Used by the suite runner to derive per-suite, per-run seeds:
`deriveSeed(baseSeed, suite.id, runIndex)`.

## Run Cache

Implemented in `src/simulation-engine/run-cache.js`.

`createRunCache()` returns an in-memory cache scoped per evaluator invocation
(not shared across genomes). The cache avoids re-running simulations with
identical configurations within a single evaluation.

API: `{ getOrRun(key, runFn) }`.

- `key`: composite string identifying the simulation configuration (e.g.,
  `"${suiteId}:${seed}"`).
- `runFn`: zero-argument function that executes the simulation and returns the
  result.
- If `key` exists in the cache, the cached result is returned immediately.
  Otherwise, `runFn()` is called, the result is stored, and then returned.

The cache is created fresh per `evaluator()` call in `create-evaluator.js`,
ensuring no cross-genome leakage.

## Outputs

Simulation returns:

- `trajectory.steps`: ordered snapshots including `legalActionCount`, `affectedPlayerIds`,
  and `affectedGlobal` for metrics.
- `trajectory.events`: internal event stream (state updates and termination).
- `outcome`: per-player outcomes (win/lose/draw) with optional scores.
- `terminationReason`: `condition`, `stalemate`, `no-legal-actions`, `max-turns`,
  `max-steps`, or `loop-detected`.
- `terminated`: boolean (true for game-terminal ends; false for safety cutoffs).
- `terminationDetail?`: optional string for human-readable/configured detail.

## Trace Fields

Each `TrajectoryStep` includes optional trace fields for motif mining and replay:

- `stateHash` (string, optional): deterministic hash of the step's state via
  `defaultStateHasher(state)` from `src/simulation-engine/loop-detection.js`.
- `bindings` (object, optional): resolved target bindings mapping binding names
  to concrete token instance IDs (e.g., `{ unit: "t3" }`).
- `appliedEffects` (AppliedEffect[], optional): ordered list of atomic effects
  actually executed in this step, including trigger-origin effects.
- `skippedEffects` (SkippedEffect[], optional): effects that failed during this
  step. Each entry has `reason` (e.g., `"bounds"`, `"unknown-variable"`),
  `source` (`"cost"` or `"effect"`), and optionally the original `effect`
  object. Present only when non-empty.
- `skippedTriggers` (SkippedTrigger[], optional): triggers that failed during
  this step. Each entry has a `reason` string. Present only when non-empty.

### AppliedEffect Type

```
{
  kind: string,           // effect kind (see list below)
  target: {
    scope: string,        // "global" | "perPlayer"
    id: string,           // variable, token type, or zone id
    kind?: string         // "var" | "token" | "zone"
  },
  source: string,         // "cost" | "effect" | "trigger"
  amount?: number,        // for inc/dec
  value?: any,            // for set
  toZone?: string,        // for move/spawn
  tokenId?: string,       // for spawn/move/destroy/reveal/hide (resolved instance id)
  zone?: string,          // for move_spatial
  fromNode?: string,      // for move_spatial
  toNode?: string,        // for move_spatial
  flag?: string,          // for set_flag
  duration?: string,      // for set_flag ("action" | "phase" | "turn" | "round")
  count?: number,         // for repeat (iterations executed)
  conditionMet?: boolean, // for conditional (evaluated branch)
  applied?: AppliedEffect[] // for repeat/conditional (nested applied effects)
}
```

Effect kinds: `set`, `inc`, `dec`, `move`, `spawn`, `destroy`, `reveal`, `hide`,
`move_spatial`, `repeat`, `conditional`, `set_flag`, `set_turn_order`, `choose`.

### Pass-Step Rules

When `actionId === null` (pass step):
- `bindings` must be `{}`
- `appliedEffects` must be `[]`

### Replay Invariant

`src/simulation-engine/replay.js` provides two verification functions:

- `verifyTraceConsistency(steps)`: checks that every step's recorded `stateHash`
  matches `defaultStateHasher(step.state)`. Returns `{ ok, failures }`.
- `replayEffectsOnState(state, appliedEffects, context?)`: applies `appliedEffects`
  to a cloned state's variables (supports `inc`, `dec`, `set` on global and perPlayer
  targets). Returns the new state without mutating the input.

## Game Kernel Modules

### Effect Dispatch (`effects.js`)

`applyEffect(state, effect, context, options)` dispatches effects by kind:

- **Variable effects** (`set`/`inc`/`dec`): target `{ kind: "var" }`. Reads/writes
  via `resolveVarValue`/`writeVarValue`, respects bounds mode (reject or clamp).
- **Token lifecycle** (`spawn`/`move`/`destroy`/`reveal`/`hide`): target
  `{ kind: "token" }`. Delegated to `token-effects.js`.
- **Spatial movement** (`move_spatial`): validates adjacency on zone's spatial graph
  before updating `token.node`.
- **Repeat wrapper** (`repeat`): executes sub-effects up to `count` times. Stops
  early on first sub-effect failure (up-to-N semantics).
- **Conditional wrapper** (`conditional`): evaluates `condition` and applies the
  `then` or `else` branch recursively.
- **Scoped flags** (`set_flag`): attaches a flag with duration to a token or player.
- **Turn order** (`set_turn_order`): sorts players by a per-player variable value
  (ascending or descending, tie-break by lower player ID) and writes the resulting
  order into `state.turn.turnOrder` for the `round_robin` scheduler to consult.
- **Player choice** (`choose`): presents `options` (array of effect arrays) and
  selects `count` of them (default 1) via `context.rng` for deterministic
  simulation. Selected option effects are applied recursively. Empty options is
  a no-op.

Expression evaluation (`evaluateExpr`) supports ref kinds: `var`, `token`
(attribute access and existence), `zone_query` (count, has_token), and
`flag_query` (checks if an entity has a flag).

### Token Effects (`token-effects.js`)

Handles spawn, move, destroy, reveal, and hide operations on token instances.
Token IDs are resolved via `context.bindings?.[id] ?? id` — binding names from
target selectors resolve to concrete instance IDs.

- `applyTokenSpawn`: allocates a new token ID, creates the instance with attributes
  from the token type definition, and places it in the target zone.
- `applyTokenMove`: removes token from its current zone (found via `findTokenZone`)
  and adds it to the destination zone. Supports an optional `toPlayer` field
  (`"self"`, `"opponent"`, `"next"`, `"previous"`) that resolves to a target player
  ID for per-player zones, enabling inter-player token transfer. When `toPlayer` is
  absent or the destination zone is global, the acting player is used.
- `applyTokenDestroy`: removes token from its zone and deletes it from `state.tokens`.
- `applyTokenReveal`/`applyTokenHide`: sets `token.revealed` to true/false.

### Target Selectors (`selectors.js`)

- `resolveSelector(selector, state, context)`: filters tokens in a zone by type,
  optional `where` expression, random shuffle (via `context.rng`), and count limit.
- `resolveActionTargets(definition, state, action, context)`: resolves all selectors
  in `action.targets` and returns a bindings object mapping target IDs to concrete
  token instance IDs.

### Scoped Flags (`flags.js`)

- `clearFlags(state, duration)`: removes all flags matching the given duration
  (`"action"`, `"phase"`, or `"turn"`) from all agents and tokens.
- Called after action execution (action), phase advance (phase), and turn advance (turn).

### Action Legality (`actions.js`)

`isActionLegal` checks preconditions, target selector availability, and cost
feasibility. If an action declares targets, all selectors must resolve to at
least one matching token. If an action declares costs, `checkCostFeasibility`
trial-applies each cost effect on a `structuredClone` of the state with
`boundsMode: "reject"` — if any cost would violate variable bounds the action
is illegal. This prevents agents from selecting actions they cannot afford.

`checkActionBounds` uses `structuredClone(state)` to deep-clone the full state
(variables, zones, tokens) before trial-applying effects, preventing bounds checks
from mutating the real game state.

## Canonical SimulationResult (Normative)

This section is the single source of truth for SimulationResult.

Required fields:

- `trajectory.steps`: ordered snapshots (must include `legalActionCount`,
  `affectedPlayerIds`, and `affectedGlobal`).
- `trajectory.events`: internal event stream.
- `terminationReason`: enum
  `condition | stalemate | no-legal-actions | max-turns | max-steps | loop-detected`.
- `terminated`: boolean
  - true for game-terminal endings (`condition`, `stalemate`, `no-legal-actions`).
  - false for safety cutoffs (`max-turns`, `max-steps`, `loop-detected`).
- `outcome`: per-player outcomes only (`win | lose | draw`) with optional scores.

Optional fields:

- `terminationDetail?`: optional string for configured/human-readable detail
  (e.g., `turn.noLegalActions.reason`).
- `stateHash?`: per-step deterministic state hash (see Trace Fields above).
- `bindings?`: per-step resolved target bindings (see Trace Fields above).
- `appliedEffects?`: per-step ordered applied effects (see Trace Fields above).
- `skippedEffects?`: per-step skipped effects with reasons (see Trace Fields above).
- `skippedTriggers?`: per-step skipped triggers with reasons (see Trace Fields above).

Hard rules:

- `outcome` must not include `reason` or `terminated`.
- All termination reasoning lives in `terminationReason` plus optional
  `terminationDetail`.
