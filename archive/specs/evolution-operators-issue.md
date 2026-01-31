# Evolution Operators Issue

I fed the architectural docs to ChatGPT so that it could find bugs or possible improvements to make. It said:

"Your evolution operators are structurally incapable of discovering whole classes of mechanics (this conflicts with your stated goal) You want “existing mechanics dismantled into primitives,” and even “new mechanics could come up.” With the current operator set, a huge chunk of the DSL search space is effectively locked. What you can mutate today (per evolutionary-engine.md) is mostly tweaks, adding/removing actions/phases/zones/token types, inserting/swapping/reordering a narrow set of effects, and adding basic triggers and limited scheduler swaps. What’s missing (or severely constrained) relative to “discover mechanics”: No variable-add / variable-remove operator (so you can’t evolve new resource economies/tracks beyond what seeding gave you). The DSL clearly supports variables as first-class state. game-definition.v1 No termination-condition add/remove operator (so you can’t evolve new win conditions; you can only “nudge thresholds” or “swap outcome types” on whatever termination conditions already exist). Schedulers: simulation supports simultaneous (and documents its flow). simulation-engine But your scheduler-swap operator only targets round_robin, priority_queue, token_holder, reactive. That blocks entire families of mechanics (simultaneous selection, reveal, drafting-like timing, etc.). Triggers: you can trigger-add, but there’s no trigger-remove/trigger-edit in the documented operator set, so trigger complexity can only ratchet upward unless pruned indirectly by deleting actions/effects. Effect space mismatch: mutation helpers intentionally operate over “12 effect kinds.” evolutionary-engine Meanwhile the simulation engine dispatch includes wrappers and multiple effect families. simulation-engine You do have special operators like choose-effect-insert and turn-order-effect-insert, but if the DSL supports more powerful constructs (deck-ish ops like shuffle/queue, etc.), your evolutionary operators are the bottleneck, not the DSL. Net: right now you’re evolving within a thin submanifold of your DSL. That’s fine for a prototype, but it’s not aligned with your “discover mechanics” ambition. Clear improvements (the ones that matter) A. Make “mechanic discovery” real: add the missing structural mutation operators If you do nothing else, do this. Variable evolution variable-add (global/per_player, int/bool/enum; generate bounds; initialize) variable-remove (rewrite dangling refs the same way you already do for zones/token types) variable-scope-toggle (global ↔ per_player with migration rule) Win-condition evolution termination-add (new condition/outcome) termination-remove termination-condition-swap (change comparator, referenced variable, threshold expression) Trigger evolution trigger-remove trigger-effect-edit (swap/insert/delete inside triggers, like you do for actions) trigger-event-swap (start_turn ↔ end_turn, etc.) If your DSL supports richer trigger events, evolve those too (don’t hardcode a “safe subset” forever). Scheduler evolution that matches the engine Extend scheduler-swap to include simultaneous at least. Once you do that, add a metric/degeneracy gate for simultaneous-resolution pathologies (ordering exploits, “everyone passes forever,” etc.). This is the difference between “tuning toy games” and “discovering mechanics.”"

Most of ChatGPT’s critique is valid, and the proposed improvements are worth it if your stated goal is “mechanic discovery,” not merely “parameter tuning.”

## Are the claims valid?

1) “No variable-add / variable-remove operator” → Valid.
Your DSL treats variables as first-class state and requires them. 

game-definition.v1


But your documented mutation operators only tweak existing variable initial values (numeric-tweak, boolean-toggle, enum-cycle) and never add/remove variables. 

evolutionary-engine


You do have crossover that can swap state.variables between parents, but that still can’t create variables ex nihilo; it only recombines what already exists in the population. 

evolutionary-engine


Consequence: Entire resource-economy families are unreachable unless they were already seeded somewhere.

2) “No termination-condition add/remove operator” → Valid.
Termination conditions are structurally required by repair (“Termination ≥ 1”). 

evolutionary-engine


Your mutations only adjust thresholds and swap outcomes; there’s no add/remove/edit of termination condition expressions. 

evolutionary-engine


Consequence: You can’t evolve new win conditions—only perturb whatever the seed already encoded.

3) “Scheduler swap blocks simultaneous / drafting-like timing” → Valid (and bigger than stated).
Your simulation engine supports simultaneous and random_draw schedulers. 

simulation-engine


Your DSL schema also allows them. 

game-definition.v1


But scheduler-swap is documented to only target round_robin, priority_queue, token_holder, reactive. 

evolutionary-engine


Consequence: You’re preventing whole timing families that the engine can already run.

4) “Triggers can only ratchet upward” → Valid (and also incomplete coverage).
You have trigger-add, but there’s no trigger remove/edit operator. 

evolutionary-engine


Also: your schema supports trigger events state_change and threshold, but your trigger-add only samples a subset and can’t create those events at all.
Consequence: trigger structures bloat, and key trigger families are unreachable.

5) “Effect space mismatch (12 effect kinds) bottlenecks DSL” → Valid, now that we can see the full set.
Mutation helpers use a canonical list of 12 effect kinds. 

evolutionary-engine


But the engine/DSL supports additional kinds including shuffle, queue_push, queue_pop (plus set_turn_order, rng_choose).
You partly compensate with special operators (choose-effect-insert for rng_choose, turn-order-effect-insert for set_turn_order). 

evolutionary-engine


…but shuffle/queue mechanics are currently locked out of random effect generation and kind swapping.

## Bottom line

Right now you’re evolving within a thin submanifold of the DSL: actions/phases/zones/token types + small effect tweaks + a subset of triggers + a subset of schedulers + a subset of effects.

If the ambition is truly “discover mechanics,” the proposed changes (plus a few extras) are more beneficial than the current architecture, even if they temporarily increase invalid offspring rates. Your runner already has strong rejection categorization and adaptive operator weighting to cope with higher failure operators.

## 1) What needs to change

### 1.1 Add state-variable structural operators
Add the following mutation operators (implemented alongside existing ones in `src/evolutionary-engine/mutation.js` per docs). 

#### variable-add
- Adds a new entry to `definition.state.variables` (schema: `VariableDef`).
- Must generate:
  - `id`: unique within `state.variables` (e.g., `var_<rng>` or `v<N>`).
  - `scope`: `"global"` or `"per_player"`.
  - `type`:
    - int: choose `min`, `max` (ensure `min < max` and sane span).
    - bool: no params.
    - enum: choose non-empty `values` and initial ∈ values.
  - `initial`: compatible with type:
    - int: integer within [min, max]
    - bool: true/false
    - enum: one of values
- If `turn.scheduler === "priority_queue"` or a `set_turn_order` effect exists, preferentially add `per_player` int variables to make those mechanics evolvable.

#### variable-remove
- Removes one variable from `definition.state.variables` **only if** at least 1 variable remains (structural minimum).
- Must repair *all* dangling references to the removed variable across:
  - Effect targets of kind var (`set/inc/dec` targets).
  - Expression refs in:
    - action preconditions
    - trigger conditions
    - termination conditions
    - `turn.orderBy.variable` (priority_queue)
    - `set_turn_order.variable`
- Repair policy (choose one and make it consistent everywhere):
  - **Redirect**: map removed var id → a remaining var of compatible scope/type when possible; else → any remaining var.
  - If no safe redirect exists for an expression subtree, replace subtree with a safe constant expression (e.g., boolean false) rather than leaving invalid refs.
- Must remain compatible with `dsl-safety` repair’s reference rewrite behavior. 

#### variable-scope-toggle
- Select a variable, flip `scope` global ↔ per_player.
- Must rewrite every reference’s `scope` to match.
- Must ensure any mechanics depending on per-player vars remain viable (priority_queue, set_turn_order).


### 1.2 Add termination structural operators (win-condition evolution)
Your schema defines `termination.conditions[]` as `{ condition: Expr, outcome: OutcomeDef }`.   
Your repair currently enforces **Termination ≥ 1**. 

#### termination-add
- Append a new `TerminationDef` with:
  - `condition`: generated Expr referencing existing vars/tokens/zones via schema-supported ref kinds.
  - `outcome`: `{ type: win|lose|draw, players: all|active|[ids] }` consistent with schema. 
- Must bias generation toward conditions that can actually become true (e.g., `cmp(var >= threshold)` with threshold inside bounds).
- Must avoid creating a condition that is trivially always true on turn 0 unless that’s explicitly desired.

#### termination-remove
- Remove one termination condition only if at least 1 remains (align with structural minimum).
- If the removed condition is the only “reachable” win path (hard to know), accept it—fitness/degeneracy metrics will punish it.

#### termination-condition-mutate (replacement for narrow `termination-threshold`)
- Replace or mutate the `condition` Expr tree:
  - swap comparator op (e.g., >= ↔ <= ↔ ==)
  - swap referenced var / zone_query / flag_query
  - adjust constants within safe bounds
  - introduce/remove `and/or/not` wrappers
- This is the “real” win-condition evolution operator; keep `termination-threshold` only if it remains useful.


### 1.3 Expand scheduler evolution to match the engine + DSL
Simulation supports schedulers: `round_robin`, `priority_queue`, `token_holder`, `simultaneous`, `random_draw`, `reactive`.   
Current `scheduler-swap` omits `simultaneous` and `random_draw`. 

#### scheduler-swap (update)
- Include `simultaneous` and `random_draw` in the swap candidate set.
- When switching to `simultaneous`:
  - Ensure `turn.resolution.order` exists; if absent, set `"by_player_id"` (or allow `"random"`). 
- When switching away from `simultaneous`, you may optionally strip `turn.resolution` (or keep it inert—pick one consistent policy).

#### scheduler-param-tweak (update)
- Add param tweaks for `simultaneous`:
  - flip `turn.resolution.order` between `"by_player_id"` and `"random"`.
- `random_draw` has no params; no-op is fine.


### 1.4 Trigger evolution: make triggers editable and complete the event set
Schema supports trigger events including `state_change` and `threshold`. 
`trigger-add` currently samples only a subset. 

#### trigger-add (update)
- Expand event sampling to include **all** schema-supported events:
  - start_turn, end_turn, start_phase, end_phase, start_round, end_round, after_action, state_change, threshold.
- For `threshold` event, preferentially generate a `condition` (since it’s likely the intended meaning).

#### trigger-remove
- Remove one trigger from `definition.triggers[]` if any exist.
- If none exist, no-op.

#### trigger-edit
Pick one trigger and apply one:
- event swap: change to another valid event.
- condition mutate: mutate Expr; or add/remove condition.
- effects edit: insert/delete/reorder effects inside the trigger (same logic as action effect operators).
- wrapper insert: allow `conditional-effect-insert` / `choose-effect-insert` inside trigger effects as well as action effects.


### 1.5 Unblock “deck-ish” and queue mechanics in effect generation
Engine and DSL support effect kinds: `shuffle`, `queue_push`, `queue_pop`, in addition to the 12 currently used by mutation helpers. 

#### effect-helpers.js (update)
- Expand `EFFECT_KINDS` to cover the full effect set supported by the engine:
  - Add at least: `shuffle`, `queue_push`, `queue_pop`.
  - You may also include `set_turn_order` and `rng_choose`, but those are already accessible via special operators; including them here is optional.
- Extend `buildRefForKind` and `buildEffectProps`:
  - shuffle: target must be a zone ref.
  - queue_push: target token ref + `toZone`.
  - queue_pop: `fromZone` (+ optional `toZone`).
- Update `effect-kind-swap` to allow swapping into these new kinds (and to return unchanged if no valid targets exist, consistent with current behavior).


### 1.6 Config + docs updates (no backward compatibility)
- Update `configs/evolution-operators.json`:
  - Add weights + enablement entries for all new operators.
  - Consider initially low weights for highly structural operators (variable-add/remove, termination-add/remove) and let adaptive weighting calibrate. 
- Update `evolutionary-engine.md` operator catalogue to reflect the new set (and remove any superseded operators if you consolidate them).


## 2) What invariants should pass

### 2.1 Schema validity
- Every mutated genome MUST validate against `game-definition.v1.json` (no additionalProperties, required fields respected).

### 2.2 Structural minimums (align with repair)
- After mutation + repair:
  - actions ≥ 1
  - at least one action has effects ≥ 1
  - termination.conditions ≥ 1
  - if any effect references zones, zones ≥ 1
(These are already enforced by `dsl-safety` repair; keep them intact.)

### 2.3 Referential integrity (stronger than today where practical)
- No expression tree may reference a non-existent variable id.
- No effect may reference:
  - missing variable id
  - missing zone id in `toZone`, `fromZone`, `zone`
  - missing token type/instance selectors (where applicable)
- For `priority_queue`:
  - `turn.orderBy.variable` MUST reference an existing **per_player int** variable, or the scheduler swap must refuse that scheduler.
- For `token_holder`:
  - `turn.tokenType` and `turn.zone` MUST reference existing structures and satisfy the schema’s conditional requirements. 
- For `simultaneous`:
  - `turn.resolution.order` MUST be present (either via schema change or operator guarantee).

### 2.4 Operator telemetry accounting
Maintain the runner’s per-operator accounting invariant:
attempts === noOp + repairFailed + rejectedTotal + validEvaluated
(and evaluated bookkeeping). :contentReference[oaicite:34]{index=34}


## 3) What tests should pass

### 3.1 Unit tests: mutation operators
Add/extend tests to ensure each new operator:
- Produces schema-valid output (or returns no-op).
- Preserves structural minimums (or causes repairFailed cleanly).
- Properly rewrites references on:
  - variable-remove
  - termination-remove (never removes last condition)
  - scheduler-swap to priority_queue/token_holder/simultaneous (required fields present and valid)
  - trigger-edit (effects remain valid)

### 3.2 Unit tests: effect helper expansion
- `buildRandomEffect` can generate:
  - shuffle with a zone target
  - queue_push with token target + valid toZone
  - queue_pop with valid fromZone (+ optional toZone)
- `effect-kind-swap` can swap an existing effect into these kinds when the definition contains suitable zones/tokens.

### 3.3 Integration tests: evaluator + simulation doesn’t crash
For a small randomized sample of mutated genomes per operator:
- `mutateAndRepairGenome()` returns one of { ok, noOp, repairFailed } and never throws. 
- Running `runSimulation` on repaired genomes returns a `SimulationResult` matching `simulation-result.schema.json` (including `terminated` and `terminationReason`).
- Specifically include cases for:
  - simultaneous scheduler flow (resolution order both modes) 
  - random_draw scheduler
  - triggers with events `state_change` and `threshold` (even if they’re mostly no-ops initially)

### 3.4 Regression tests: repair behavior
- `dsl-safety` repair continues to:
  - clamp invalid variable initials
  - rewrite dangling refs (or drop/strip where specified)
  - reject structurally empty genomes
These behaviors are documented; the expanded mutation set must not break them.

## Update architectural docs

Review all the architectural docs at docs/architecture/ and update them as necessary given these changes.