# Action Selection & Turn Structure Primitives Spec

Comprehensive analysis of 27 action-selection / turn-structure mechanics against the LudoForge DSL, game kernel, and evolutionary engine. Each mechanic is decomposed into minimal DSL primitives with current representation status, feasibility, invariants, and required tests.

---

## Table of Contents

1. [Per-Mechanic Analysis](#per-mechanic-analysis) (27 mechanics)
2. [Consolidated New Primitives](#consolidated-new-primitives)
3. [Implementation Priority Waves](#implementation-priority-waves)
4. [Coverage Matrix](#coverage-matrix)

---

## Per-Mechanic Analysis

### 1. Action Drafting

**Description**: Players select from a shared pool of limited-quantity actions; once chosen, an action is unavailable.

**Primitive Decomposition**:
- Global `ordered` zone holding action tokens (one per draftable action)
- Actions with precondition: `zone_query(count > 0)` on corresponding token
- Effect: `move` token from shared pool to player's "taken" zone (or `destroy`)
- `start_round` trigger to respawn/reset the pool each round

**Current Representation**: Partial
- Zones, tokens, preconditions, move effects all exist
- Missing: `start_round` trigger event to reset the pool each round

**Feasibility**: High -- requires only `start_round` trigger event (Wave 1)

**Required Changes**:
- Add `start_round` / `end_round` trigger events to schema and trigger system

**Invariants**:
- INV-1: Pool token count must never go negative
- INV-2: A token moved out of the pool must not be selectable by another player in the same round
- INV-3: Pool must be fully restored at round start

**Tests**:
- T-1: Two players draft from a 3-action pool; after both draft, pool has 1 remaining
- T-2: Player cannot draft an action whose pool token is already taken
- T-3: Pool resets at start of new round (all tokens restored)
- T-4: Attempting to draft from empty pool returns no legal actions
- T-5: With `start_round` trigger, pool state is correct across multiple rounds

---

### 2. Action / Event

**Description**: Player plays a card showing Action Points and an Event; must choose one. If AP chosen, opponent may perform the Event.

**Primitive Decomposition**:
- Token type "card" with attributes: `ap_value` (int), `event_id` (enum)
- Two actions per card: "use_ap" (costs: move card to discard; effects: inc AP variable) and "use_event" (costs: move card to discard; effects: event-specific)
- Preconditions ensuring mutual exclusivity (card in hand zone)
- `after_action` trigger: if "use_ap" was chosen, grant opponent the event action via `set_flag` on opponent + conditional precondition

**Current Representation**: Partial
- Token attributes, zones, move effects, preconditions exist
- `after_action` trigger exists
- Missing: `conditional` effect kind for branching based on who chose what
- Missing: clean way to "offer" an action to another player mid-turn

**Feasibility**: Medium -- representable with flags and preconditions today; cleaner with `conditional` effect (Wave 1)

**Required Changes**:
- `conditional` effect kind (Wave 1) for cleaner branching
- Possibly `choose` effect (Wave 2) if player agency in event execution matters

**Invariants**:
- INV-1: A card can only be used for AP or Event, never both
- INV-2: If AP is chosen, the event must become available to exactly one opponent
- INV-3: Card must move to discard after either choice

**Tests**:
- T-1: Player chooses AP; AP variable increments correctly; card moves to discard
- T-2: Player chooses Event; event effects apply; card moves to discard
- T-3: After AP choice, opponent gains event action (flag set)
- T-4: Opponent cannot use event if original player chose event
- T-5: Card cannot be used twice in same round

---

### 3. Action Points

**Description**: Player receives AP on their turn and spends them on various actions.

**Primitive Decomposition**:
- Per-player variable `ap` (int, min: 0)
- `start_phase` or `start_turn` trigger: `{ kind: "set", target: { kind: "var", id: "ap" }, value: N }`
- Actions with costs: `{ kind: "dec", target: { kind: "var", id: "ap" }, amount: X }`
- Preconditions: `{ kind: "cmp", op: ">=", left: ap_ref, right: cost_value }`

**Current Representation**: Full
- Per-player variables, triggers (`start_turn`, `start_phase`), costs (dec), preconditions (cmp) all exist
- Scheduler `round_robin` handles turn cycling
- `boundsMode` on variables enforces min:0

**Feasibility**: Already implementable, no changes needed

**Required Changes**: None

**Invariants**:
- INV-1: AP must never go below 0 (enforced by `boundsMode: "reject"` or precondition)
- INV-2: AP must reset at start of turn/phase
- INV-3: Cost deduction must be atomic with effect application

**Tests**:
- T-1: Player starts turn with correct AP
- T-2: Action costing 2 AP reduces AP by 2
- T-3: Action costing more AP than available is not legal
- T-4: AP resets correctly at start of next turn
- T-5: Multiple actions can be taken in one turn until AP exhausted

---

### 4. Action Queue

**Description**: Players create queues of actions executed in sequence. Batch (all planned then executed) or Rolling (add to end, execute from front).

**Primitive Decomposition**:
- Ordered zone "action_queue" (per-player or global) holding action tokens
- "plan" phase: player adds action tokens to queue via `spawn` or `move`
- "execute" phase: kernel pops tokens from front, resolves effects
- New effect `queue_push` / `queue_pop` for FIFO semantics, OR model via ordered zone index
- Batch variant: planning phase locks queue, execution phase drains it
- Rolling variant: each turn adds one to back, pops one from front

**Current Representation**: Partial
- Ordered zones exist
- Token spawn/move/destroy exist
- Missing: queue-specific effects (`queue_push`, `queue_pop`) or ordered-zone index access
- Missing: phase-gated execution (partially available via phase preconditions)

**Feasibility**: Medium -- ordered zones provide foundation; queue pop semantics need new effect or convention

**Required Changes**:
- Wave 3: `queue_push` / `queue_pop` effects (or extend `move` with positional targeting)
- Phase preconditions already work for batch/execute separation

**Invariants**:
- INV-1: Queue order must be preserved (FIFO)
- INV-2: Batch queue must not allow additions during execution phase
- INV-3: Rolling queue must execute exactly one action per turn-step
- INV-4: Empty queue must be handled gracefully (pass or end turn)

**Tests**:
- T-1: Batch: 3 actions planned, all 3 execute in order
- T-2: Rolling: add to back, pop from front, queue length stays bounded
- T-3: Cannot add to batch queue during execution phase
- T-4: Empty queue results in pass or no-legal-actions policy
- T-5: Queue persists across phases correctly

---

### 5. Action Retrieval

**Description**: Player has a set of actions (cards/tokens); once performed they are spent. Retrieval is itself an action or takes a turn.

**Primitive Decomposition**:
- Per-player zone "available_actions" (ordered) and "spent_actions" (ordered)
- Each action token represents a performable action
- Performing: `move` token from available to spent; precondition: token in available
- Retrieve action: `move` all tokens from spent back to available (or `repeat` + `move`)
- Alternative: retrieve as entire turn (precondition: no other action taken this turn)

**Current Representation**: Partial
- Zones, move effects, preconditions all exist
- `repeat` effect exists for batch moves
- Missing: "move all tokens matching filter" (bulk move); current `move` targets single token

**Feasibility**: High -- achievable with `repeat` + targeted `move`, or a future bulk-move extension

**Required Changes**:
- Minor: could benefit from a `move_all` effect or zone-query-based targeting (nice-to-have, Wave 3)
- Workaround: `repeat` with `count` set to max hand size works today

**Invariants**:
- INV-1: A spent action token must not be usable until retrieved
- INV-2: Retrieval must move all (or specified) tokens from spent to available
- INV-3: Token count must be conserved (available + spent = total)

**Tests**:
- T-1: Perform action; token moves from available to spent
- T-2: Spent action not in legal actions list
- T-3: Retrieve action moves all spent tokens to available
- T-4: After retrieval, all actions are legal again
- T-5: Token count conservation across perform/retrieve cycles

---

### 6. Action Timer

**Description**: Players place timers on action spaces; when expired, move to another. No turns -- players act when timers expire.

**Primitive Decomposition**:
- Per-player tokens "timer" with attribute `remaining` (int, min: 0)
- Spatial zone representing action spaces (nodes = action spaces, edges = valid moves)
- `end_phase` trigger: `dec` remaining on all timers by 1
- Precondition for moving timer: `remaining == 0`
- Effect of moving: `move_spatial` + `set` remaining to action's cost
- No turn scheduler -- requires `simultaneous` or `reactive` scheduler

**Current Representation**: Minimal
- Spatial zones, `move_spatial`, token attributes exist
- Missing: `simultaneous` scheduler (all players act concurrently)
- Missing: `reactive` scheduler (act when timer expires, not on turn)
- Timer decrement via trigger is possible with `end_phase`

**Feasibility**: Low-Medium -- needs new scheduler type (`reactive`), Wave 3

**Required Changes**:
- `reactive` scheduler (Wave 3) -- players act when conditions met, not in fixed order
- Alternatively: approximate with `simultaneous` scheduler (Wave 2) + timer preconditions

**Invariants**:
- INV-1: Timer must count down exactly once per time unit
- INV-2: Action can only be taken when timer reaches 0
- INV-3: Moving a timer resets it to the new action's cost
- INV-4: Multiple players can act in the same time step

**Tests**:
- T-1: Timer starts at cost value, decrements each step
- T-2: Cannot move timer when remaining > 0
- T-3: Moving timer to new space sets remaining to that space's cost
- T-4: Two players can act simultaneously when both timers expire
- T-5: Timer on space with cost 0 allows immediate re-move

---

### 7. Advantage Token

**Description**: One player has a special token granting a special/modified action. Once used, passes to another player.

**Primitive Decomposition**:
- Single global token "advantage" in a zone
- Zone scope: per-player (token is in exactly one player's zone)
- Action with precondition: `zone_query` checking advantage token in player's zone
- Effect: perform special action + `move` advantage token to next player's zone (or `transfer_token`)

**Current Representation**: Partial
- Zones, tokens, move effects, zone_query preconditions exist
- `move` with `toZone` can transfer between zones
- Missing: convenient `toPlayer` on `move` effect (must specify player-scoped zone by player)

**Feasibility**: High -- achievable today with per-player zones; cleaner with `move` `toPlayer` extension (Wave 1)

**Required Changes**:
- Wave 1 (nice-to-have): extend `move` effect with `toPlayer` field for inter-player token transfer

**Invariants**:
- INV-1: Exactly one advantage token exists at all times
- INV-2: Token is in exactly one player's zone
- INV-3: After use, token must transfer to a different player
- INV-4: Special action only legal when player holds the token

**Tests**:
- T-1: Player with advantage token can take special action
- T-2: Player without token cannot take special action
- T-3: After use, token moves to next player
- T-4: Token count remains exactly 1 throughout game
- T-5: Special action effects apply correctly

---

### 8. Auction

**Description**: Players bid for turn order using various auction mechanisms.

**Primitive Decomposition**:
- Per-player variable `bid` (int, min: 0)
- "bidding" phase: actions to set/increment bid (with cost from player's currency)
- `end_round` trigger (or dedicated resolution phase): evaluate bids, set turn order
- New effect: `set_turn_order` to reorder player sequence based on bid values
- Pass action: player locks their bid

**Current Representation**: Minimal
- Per-player variables, phases, costs exist
- Missing: `set_turn_order` effect
- Missing: `end_round` trigger
- Scheduler only supports `round_robin` -- cannot dynamically reorder

**Feasibility**: Medium -- requires `set_turn_order` effect (Wave 2) and dynamic scheduler support

**Required Changes**:
- `end_round` trigger event (Wave 1)
- `set_turn_order` effect (Wave 2)
- Scheduler must accept dynamic player ordering

**Invariants**:
- INV-1: Bid must not exceed player's available currency
- INV-2: Turn order must reflect bid ranking (highest first, or lowest, depending on variant)
- INV-3: Tied bids must have a deterministic resolution
- INV-4: Currency spent on bids must be deducted

**Tests**:
- T-1: Player bids 5; currency decreases by 5
- T-2: After bidding phase, turn order matches bid ranking
- T-3: Cannot bid more than available currency
- T-4: Tie resolution produces consistent ordering
- T-5: Turn order persists for the full round after auction

---

### 9. Claim Action

**Description**: An action claims first-player position for next round; if unclaimed, order unchanged.

**Primitive Decomposition**:
- Global variable `next_first_player` (int)
- Action "claim_first_player": sets `next_first_player` to acting player's id
- `end_round` trigger: `set_turn_order` starting from `next_first_player`, then reset variable
- Precondition: `next_first_player` has not been claimed this round (use flag)

**Current Representation**: Partial
- Variables, actions, flags exist
- Missing: `end_round` trigger
- Missing: `set_turn_order` effect

**Feasibility**: Medium -- requires Wave 1 (`end_round`) + Wave 2 (`set_turn_order`)

**Required Changes**:
- `end_round` trigger event (Wave 1)
- `set_turn_order` effect (Wave 2)

**Invariants**:
- INV-1: At most one player can claim first-player per round
- INV-2: If unclaimed, turn order must not change
- INV-3: Claim action must be available to all players during the round
- INV-4: New order takes effect next round, not immediately

**Tests**:
- T-1: Player claims first; next round they go first
- T-2: No claim; turn order unchanged
- T-3: Second claim attempt in same round is illegal (flag blocks)
- T-4: Claimed order applies only starting next round
- T-5: Progressive (clockwise) order from claimed first player

---

### 10. Command Cards

**Description**: Hand of cards activates subsets of units for actions.

**Primitive Decomposition**:
- Per-player zone "hand" (ordered, private) holding command-card tokens
- Each card token has attribute `unit_filter` (enum: region/type/count)
- Playing a card: `move` card from hand to discard
- Card's `unit_filter` sets a flag or variable indicating which units are activated
- Unit actions have precondition: unit matches active filter
- `start_turn` trigger or effect clears activation flags

**Current Representation**: Partial
- Zones, tokens with attributes, move effects, flags, preconditions exist
- `set_flag` effect with duration exists
- Missing: easy way to express "activate units matching filter" (achievable with flags + preconditions)

**Feasibility**: High -- fully achievable with current primitives + flags

**Required Changes**: None strictly required; `conditional` effect (Wave 1) makes it cleaner

**Invariants**:
- INV-1: Only activated units can take actions
- INV-2: Playing a card must consume it from hand
- INV-3: Activation must clear at end of turn
- INV-4: Hand size constraints must be enforced

**Tests**:
- T-1: Play card; matching units become actionable
- T-2: Non-matching units remain inactive
- T-3: Card moves from hand to discard on play
- T-4: Activation clears at turn end
- T-5: No legal unit actions when no card played

---

### 11. Follow

**Description**: One player selects an action; others may perform it (or modified version).

**Primitive Decomposition**:
- "leader" phase: active player takes an action, system records which action via global variable
- "follow" phase: other players get precondition-gated access to same action (or weaker version)
- Global variable `lead_action_id` (enum of action ids)
- Follow actions: precondition checks `lead_action_id`, effects are subset/variant of lead action
- `start_turn` trigger resets `lead_action_id`

**Current Representation**: Partial
- Phases, variables, preconditions, multiple action definitions exist
- Missing: clean multi-phase-within-turn structure for lead/follow
- Achievable with phases: `["lead", "follow_p2", "follow_p3", ...]`

**Feasibility**: High -- achievable with phases + variables + preconditions

**Required Changes**: None strictly required; benefits from `conditional` effect (Wave 1) for variant follow actions

**Invariants**:
- INV-1: Follow action must reference the lead action
- INV-2: Follow is optional (player can pass)
- INV-3: Lead action variable must be set before follow phase
- INV-4: Modified follow must be weaker or equivalent to lead

**Tests**:
- T-1: Leader takes action; followers can take same action
- T-2: Follower passes; no penalty
- T-3: Follow action applies correct (possibly modified) effects
- T-4: Lead action variable resets at turn boundary
- T-5: All non-leader players get follow opportunity

---

### 12. Impulse Movement

**Description**: Turn broken into impulses; units move in specific impulses based on speed.

**Primitive Decomposition**:
- Global variable `impulse_counter` (int)
- Token attribute `speed` (int) on unit tokens
- Phase structure: multiple impulse sub-phases per turn
- Unit action precondition: `impulse_counter % speed == 0` (requires modulo in Expr)
- `start_phase` trigger increments `impulse_counter`
- Spatial zone for movement

**Current Representation**: Minimal
- Variables, token attributes, phases, spatial zones exist
- Missing: modulo operator in `Expr` (only `cmp` with `==`, `<`, etc.)
- Missing: fine-grained impulse scheduling (could approximate with many phases)

**Feasibility**: Medium -- needs modulo in expressions or workaround with multiple speed-specific phases

**Required Changes**:
- Extend `Expr` with arithmetic operators (modulo) -- or Wave 3 specialized impulse scheduler
- Workaround: enumerate impulse phases per speed tier (e.g., phases: `["impulse_fast", "impulse_all", "impulse_fast", "impulse_all", ...]`)

**Invariants**:
- INV-1: A unit with speed S moves every S-th impulse
- INV-2: Impulse counter must increment exactly once per impulse
- INV-3: Faster units must get more move opportunities per turn
- INV-4: Movement must respect spatial adjacency

**Tests**:
- T-1: Speed-1 unit moves every impulse
- T-2: Speed-2 unit moves every other impulse
- T-3: Impulse counter increments correctly
- T-4: Spatial movement validates adjacency
- T-5: Mixed-speed units interleave correctly across impulses

---

### 13. Interrupts

**Description**: Players take actions that interrupt normal turn flow.

**Primitive Decomposition**:
- Action with `metadata.speed: "reaction"` (already in schema)
- `reactive` scheduler allowing out-of-turn action execution
- Trigger: specific game state condition enables interrupt window
- Priority system: interrupt actions evaluated before normal resolution
- Stack semantics: interrupts can be responded to (interrupt-the-interrupt)

**Current Representation**: Minimal
- `metadata.speed: "reaction"` exists in ActionDef schema
- Missing: reactive scheduler that checks for reaction actions between normal actions
- Missing: interrupt stack/priority resolution

**Feasibility**: Low -- requires `reactive` scheduler (Wave 3) with interrupt stack

**Required Changes**:
- `reactive` scheduler (Wave 3)
- Interrupt resolution stack in game kernel
- Priority ordering for simultaneous interrupts

**Invariants**:
- INV-1: Interrupt must be resolvable before the interrupted action completes
- INV-2: Interrupt window must be well-defined (trigger condition)
- INV-3: Stack must resolve LIFO
- INV-4: A player can only interrupt if they have a legal reaction action

**Tests**:
- T-1: Player plays reaction action; interrupts opponent's action
- T-2: No reaction available; normal flow continues
- T-3: Counter-interrupt (stack depth 2) resolves correctly
- T-4: Interrupt window closes after resolution
- T-5: Reaction action costs/preconditions are enforced

---

### 14. Order Counters

**Description**: Players place order markers on board regions; all markers execute in sequence after placement.

**Primitive Decomposition**:
- "planning" phase: players place order tokens on spatial zones via `spawn` or `move`
- Order token attributes: `order_type` (enum of action types), `priority` (int)
- "execution" phase: kernel iterates order tokens in priority/position order, resolves each
- `priority_queue` scheduler or ordered execution within a phase
- `conditional` effect: order token's `order_type` determines which effects fire

**Current Representation**: Minimal
- Spatial zones, tokens, spawn, move exist
- Missing: `priority_queue` scheduler (Wave 1)
- Missing: `conditional` effect (Wave 1)
- Missing: mechanism to "resolve" a token as an action

**Feasibility**: Medium -- achievable with Wave 1 primitives (`priority_queue` + `conditional`)

**Required Changes**:
- `priority_queue` scheduler (Wave 1)
- `conditional` effect (Wave 1)
- Convention: order tokens carry action metadata resolved during execution phase

**Invariants**:
- INV-1: Markers cannot be moved/changed after planning phase ends
- INV-2: Execution order must follow priority/placement rules
- INV-3: Each marker executes exactly once
- INV-4: Markers are cleared/removed after execution

**Tests**:
- T-1: Place 3 markers; all execute in priority order
- T-2: Cannot place markers during execution phase
- T-3: Each marker's action effects apply correctly
- T-4: Markers cleared after execution
- T-5: Conflicting markers on same region resolve deterministically

---

### 15. Passed Action Token

**Description**: Players with action tokens take turns, then pass tokens clockwise. Holding multiple tokens incurs penalty.

**Primitive Decomposition**:
- Tokens "action_token" in per-player zones
- `token_holder` scheduler: player with token acts, then passes it
- Precondition for acting: player holds at least one action token
- Effect after action: `move` token to next player's zone
- Penalty trigger: `threshold` or `state_change` on token count > 1 in one player's zone

**Current Representation**: Minimal
- Tokens, zones, move, preconditions, threshold triggers exist
- Missing: `token_holder` scheduler (Wave 1)
- Missing: penalty logic for multiple token accumulation (achievable with triggers)

**Feasibility**: Medium -- requires `token_holder` scheduler (Wave 1)

**Required Changes**:
- `token_holder` scheduler (Wave 1)
- Penalty: modelable with existing `threshold` trigger + `dec` effect on violating player

**Invariants**:
- INV-1: Only a player holding a token can act
- INV-2: Token must pass to next player after action
- INV-3: Holding multiple tokens triggers penalty
- INV-4: Total token count is conserved

**Tests**:
- T-1: Player with token takes action; token passes clockwise
- T-2: Player without token has no legal actions
- T-3: Player holding 2 tokens receives penalty
- T-4: Token conservation: sum of all player tokens constant
- T-5: Multiple token holders act in correct order

---

### 16. Pass Order

**Description**: Players may act or pass; first passer becomes first player next round, etc.

**Primitive Decomposition**:
- Per-player variable `has_passed` (bool, initial: false)
- Global variable `pass_order_counter` (int, tracks position in next round order)
- Per-player variable `next_round_position` (int)
- "pass" action: sets `has_passed` = true, sets `next_round_position` = `pass_order_counter`, increments counter
- Turn skip: player with `has_passed == true` is skipped by scheduler
- `end_round` trigger: `set_turn_order` based on `next_round_position` values, reset all pass variables

**Current Representation**: Minimal
- Variables, actions, preconditions exist
- Missing: `set_turn_order` effect (Wave 2)
- Missing: scheduler that skips passed players
- Missing: `end_round` trigger (Wave 1)

**Feasibility**: Medium -- requires Wave 1 (`end_round`) + Wave 2 (`set_turn_order`) + scheduler skip logic

**Required Changes**:
- `end_round` trigger (Wave 1)
- `set_turn_order` effect (Wave 2)
- Scheduler must support skipping players based on variable/flag

**Invariants**:
- INV-1: Once passed, player cannot act again this round
- INV-2: Pass order directly determines next round's turn order
- INV-3: All players must eventually pass (round must end)
- INV-4: Pass order counter must increment exactly once per pass

**Tests**:
- T-1: Player passes; they are skipped for remainder of round
- T-2: First passer becomes first player next round
- T-3: All pass; round ends, new order takes effect
- T-4: Non-passing players continue acting
- T-5: Reverse pass order variant: later passers go first

---

### 17. Programmed Movement

**Description**: Players simultaneously program movement, then reveal and execute.

**Primitive Decomposition**:
- `simultaneous` scheduler for planning phase
- Per-player zone "program" (ordered, private) for planned moves
- "planning" phase: players simultaneously `spawn` move tokens into program zone
- "execution" phase: reveal all programs, execute in order
- Spatial zone for actual movement resolution
- Conflict resolution when programs collide

**Current Representation**: Minimal
- Zones (ordered, private), tokens, spatial zones exist
- Missing: `simultaneous` scheduler (Wave 2)
- Missing: private-then-reveal zone visibility transition

**Feasibility**: Medium -- requires `simultaneous` scheduler (Wave 2)

**Required Changes**:
- `simultaneous` scheduler (Wave 2)
- Zone visibility toggle (or reveal all tokens in program zone at execution start)

**Invariants**:
- INV-1: Programs are private during planning phase
- INV-2: All programs reveal simultaneously before execution
- INV-3: Execution order must be deterministic (e.g., by player order)
- INV-4: Spatial movement must respect zone topology

**Tests**:
- T-1: Both players program moves; both resolve in execution phase
- T-2: Programs are hidden during planning (private zone)
- T-3: Collision resolution applies when two units target same node
- T-4: Spatial adjacency enforced during execution
- T-5: Program zone clears after execution

---

### 18. Progressive

**Description**: First-player token passes left each round; turns proceed clockwise from first player.

**Primitive Decomposition**:
- Global variable `first_player` (int)
- `end_round` trigger: `first_player = (first_player % player_count) + 1`
- Turn order computed from `first_player` position, clockwise
- This is an extension of `round_robin` with rotating start

**Current Representation**: Mostly representable
- `round_robin` scheduler exists and cycles players
- Missing: rotating start position per round (scheduler always starts from player 1)
- Missing: `end_round` trigger for start rotation

**Feasibility**: High -- requires `end_round` trigger (Wave 1) + scheduler respects `first_player` variable

**Required Changes**:
- `end_round` trigger (Wave 1)
- Scheduler enhancement: `round_robin` with configurable start player

**Invariants**:
- INV-1: First player advances by 1 each round (left/clockwise)
- INV-2: All players take exactly one turn per round
- INV-3: Play order is always clockwise from first player
- INV-4: Regressive variant: counterclockwise

**Tests**:
- T-1: Round 1: P1 first. Round 2: P2 first. Round 3: P3 first.
- T-2: Within round, order is clockwise from first player
- T-3: After player_count rounds, first player cycles back to P1
- T-4: All players get exactly one turn per round
- T-5: Regressive variant: first player moves right (counterclockwise)

---

### 19. Random

**Description**: Random draw determines which player/piece acts next.

**Primitive Decomposition**:
- `random_draw` scheduler: at each step, randomly select next player
- RNG integration with seeded RNG for determinism
- Optional: token-bag-based (tokens in zone, draw randomly via `selector.random`)

**Current Representation**: None
- Scheduler only supports `round_robin`
- Seeded RNG exists in simulation engine but not connected to scheduling

**Feasibility**: Medium -- requires `random_draw` scheduler (Wave 2)

**Required Changes**:
- `random_draw` scheduler (Wave 2)
- Connect seeded RNG to scheduler selection

**Invariants**:
- INV-1: Selection must use seeded RNG for reproducibility
- INV-2: All players must have non-zero probability of selection
- INV-3: Selection is independent each step (memoryless)
- INV-4: Simulation reproducibility with same seed

**Tests**:
- T-1: With seed S, player sequence is deterministic
- T-2: Over many steps, all players are selected (probabilistic)
- T-3: Same seed produces identical game trajectory
- T-4: Different seeds produce different sequences
- T-5: Integration with simulation loop (select → act → repeat)

---

### 20. Role Order

**Description**: Players secretly select roles/priorities; revealed simultaneously; role determines action order.

**Primitive Decomposition**:
- `simultaneous` scheduler for selection phase
- Per-player variable `selected_role` (enum of roles)
- Roles have defined priority ordering
- "selection" phase (simultaneous): each player sets `selected_role`
- "resolution" phase: `set_turn_order` based on role priorities
- "execution" phase: players act in resolved order

**Current Representation**: Minimal
- Variables (enum), phases exist
- Missing: `simultaneous` scheduler (Wave 2)
- Missing: `set_turn_order` effect (Wave 2)

**Feasibility**: Medium -- requires Wave 2 (`simultaneous` + `set_turn_order`)

**Required Changes**:
- `simultaneous` scheduler (Wave 2)
- `set_turn_order` effect (Wave 2)

**Invariants**:
- INV-1: Selections are secret until reveal
- INV-2: Role priority determines execution order deterministically
- INV-3: Tied roles must have resolution rules
- INV-4: Each player selects exactly one role

**Tests**:
- T-1: Player selects role; it remains hidden until reveal
- T-2: After reveal, turn order matches role priority
- T-3: Tied roles resolve consistently
- T-4: All players must select before resolution
- T-5: Role effects apply during execution in correct order

---

### 21. Rondel

**Description**: Actions on a circular track; players move tokens around the rondel, paying more to move farther.

**Primitive Decomposition**:
- Spatial zone "rondel" with circular node topology (edges: A-B, B-C, ..., Z-A)
- Per-player token on rondel node
- Action: `move_spatial` along rondel edges (must move forward, not backward)
- Cost scales with distance moved: per-step cost variable or distance-based cost calculation
- Action determined by destination node (node attribute or `conditional` effect)

**Current Representation**: Partial
- Spatial zones with nodes/edges exist
- `move_spatial` effect exists (single-hop adjacency only)
- Missing: multi-hop `move_spatial` (current only supports adjacent nodes)
- Missing: distance-based cost calculation
- Missing: directional edges (current edges are bidirectional)

**Feasibility**: Low-Medium -- requires multi-hop spatial movement (Wave 3) + directional edges or convention

**Required Changes**:
- Wave 3: multi-hop `move_spatial` (or `move_spatial` with `distance` parameter)
- Wave 3: directional edges or forward-only constraint
- `conditional` effect (Wave 1) for node-dependent action resolution

**Invariants**:
- INV-1: Movement must be forward-only around the rondel
- INV-2: Cost increases with distance moved
- INV-3: Player token must be on exactly one rondel node
- INV-4: Action taken is determined by destination node

**Tests**:
- T-1: Move 1 step; pay minimum cost; land on adjacent node
- T-2: Move 3 steps; pay 3x cost; skip intermediate nodes
- T-3: Cannot move backward
- T-4: Action at destination node fires correctly
- T-5: Rondel wraps around (Z to A)

---

### 22. Simultaneous Action Selection

**Description**: All players plan secretly and simultaneously, then reveal.

**Primitive Decomposition**:
- `simultaneous` scheduler: all players plan in same phase
- Per-player private zone or variable for secret selection
- "plan" phase: `simultaneous` -- all players choose actions
- "reveal" phase: make selections public
- "resolve" phase: execute all selections (with conflict resolution)

**Current Representation**: None for simultaneous planning
- Private zones exist
- Missing: `simultaneous` scheduler (Wave 2)

**Feasibility**: Medium -- requires `simultaneous` scheduler (Wave 2)

**Required Changes**:
- `simultaneous` scheduler (Wave 2)
- Zone visibility transition mechanism (private → public)

**Invariants**:
- INV-1: All players must plan before any reveal
- INV-2: Plans are private until simultaneous reveal
- INV-3: Resolution order must be deterministic
- INV-4: Conflicts must be handled explicitly

**Tests**:
- T-1: Both players plan; neither sees other's plan
- T-2: Plans revealed simultaneously
- T-3: Resolution applies all plans in defined order
- T-4: Conflicting plans handled by resolution rules
- T-5: Plans locked after submission (no changes during reveal)

---

### 23. Stat-Based

**Description**: Turn order within round set by player statistic (e.g., lowest score goes first).

**Primitive Decomposition**:
- Per-player variable used for ordering (e.g., `score`)
- `start_round` trigger: `set_turn_order` sorting players by the stat variable
- Configurable: ascending (catch-up) or descending order

**Current Representation**: Minimal
- Per-player variables exist
- Missing: `start_round` trigger (Wave 1)
- Missing: `set_turn_order` effect (Wave 2)

**Feasibility**: Medium -- requires Wave 1 (`start_round`) + Wave 2 (`set_turn_order`)

**Required Changes**:
- `start_round` trigger (Wave 1)
- `set_turn_order` effect with sort-by-variable capability (Wave 2)

**Invariants**:
- INV-1: Turn order must reflect current stat values at round start
- INV-2: Order direction (asc/desc) must be configurable
- INV-3: Ties must have deterministic resolution
- INV-4: Order computed once per round, not mid-round

**Tests**:
- T-1: Player with lowest score goes first (ascending)
- T-2: Scores change mid-round; order doesn't change until next round
- T-3: Tied scores resolve consistently
- T-4: Descending variant: highest score first
- T-5: Order recalculated correctly each round

---

### 24. Time Track

**Description**: Linear track; lowest marker acts next. Actions cost time (advance marker). Same player may act multiple times in a row.

**Primitive Decomposition**:
- Per-player variable `time_position` (int, min: 0)
- `priority_queue` scheduler: lowest `time_position` acts next
- Actions have time cost: effect `inc` on `time_position` by action's time value
- Same player acts again if still lowest after advancing
- Termination condition: all players exceed track length (or other condition)

**Current Representation**: Minimal
- Per-player variables exist
- Missing: `priority_queue` scheduler (Wave 1) -- select player with lowest value
- Time cost is just a variable `inc`, which exists

**Feasibility**: High -- achievable with `priority_queue` scheduler (Wave 1)

**Required Changes**:
- `priority_queue` scheduler (Wave 1): next player = player with minimum value of specified variable

**Invariants**:
- INV-1: Player with lowest time_position always acts next
- INV-2: Time cost must advance position by exact action cost
- INV-3: Same player can act consecutively if still lowest
- INV-4: Tied positions must have deterministic resolution

**Tests**:
- T-1: P1 at pos 0, P2 at pos 3; P1 acts
- T-2: P1 takes action costing 5 (pos=5); P2 at 3 acts next
- T-3: P1 takes cheap action (cost 1, pos=1); P1 acts again (still < P2)
- T-4: Tie at same position resolves consistently
- T-5: Track position only increases, never decreases

---

### 25. Variable Phase Order

**Description**: Phase/action order varies between turns based on player choices or game state.

**Primitive Decomposition**:
- Dynamic phase ordering per turn
- Phase order determined by player action (e.g., role selection) or game state
- `set_turn_order` effect applied to phases rather than players
- Or: all actions available each turn but preconditions vary based on what's been done

**Current Representation**: Partial
- Phases exist and are ordered in `turn.phases`
- Actions can be phase-gated via `metadata.phase`
- Missing: dynamic phase reordering
- Achievable workaround: all phases available, preconditions limit valid actions per state

**Feasibility**: High (with workaround) -- express via preconditions + variables tracking taken actions

**Required Changes**:
- None strictly required (workaround via preconditions)
- Nice-to-have: `shuffle` effect on phase order (Wave 2)

**Invariants**:
- INV-1: Each phase must execute exactly once per turn (if mandatory)
- INV-2: Phase ordering must be deterministic given inputs
- INV-3: Actions must respect current phase's constraints
- INV-4: Phase order may change each turn

**Tests**:
- T-1: Turn 1 phases: [A, B, C]. Turn 2 phases: [B, A, C] (different order)
- T-2: Each phase executes once regardless of order
- T-3: Phase-gated actions respect current phase
- T-4: Player choice determines next turn's phase order
- T-5: All phases complete before turn ends

---

### 26. Worker Placement

**Description**: Place workers on action spaces (one at a time, in turn). Spaces may be blocked or get more expensive when occupied.

**Primitive Decomposition**:
- Per-player tokens "worker" in per-player zone "worker_pool"
- Global zone "action_board" with one node per action space (spatial or regular)
- "placement" phase: `move` worker from pool to action space
- Precondition: action space node has capacity (zone_query count < max)
- Effect: action space's effect fires (inc/dec/move/spawn etc.)
- `start_round` trigger: return all workers to pools
- Capacity constraint via zone_query in preconditions

**Current Representation**: Partial
- Zones, tokens, move effects, zone_query, preconditions exist
- `start_round` trigger missing (Wave 1)
- Capacity checking via `zone_query(count)` exists

**Feasibility**: High -- mostly achievable today; needs `start_round` trigger (Wave 1) for worker return

**Required Changes**:
- `start_round` trigger (Wave 1) to return workers
- Everything else exists

**Invariants**:
- INV-1: Action space capacity must not be exceeded
- INV-2: Worker must come from player's pool
- INV-3: Workers return to pools at round start
- INV-4: Blocked space cannot accept more workers
- INV-5: Worker count per player is conserved

**Tests**:
- T-1: Place worker on empty space; action fires
- T-2: Space at capacity; cannot place more workers
- T-3: Workers return to pools at round start
- T-4: Blocking: second player cannot use occupied space (capacity 1)
- T-5: Worker count conservation across rounds

---

### 27. Worker Placement with Dice

**Description**: Workers are dice; pip values affect placement or action strength.

**Primitive Decomposition**:
- Per-player tokens "worker_die" with attribute `pip_value` (int, min: 1, max: 6)
- `start_round` trigger: roll dice (set `pip_value` to random 1-6 using RNG)
- Placement preconditions may require minimum pip value
- Action effects may scale with pip value (e.g., `inc` amount = `pip_value`)
- Spatial zone for placement board

**Current Representation**: Partial
- Tokens with int attributes exist
- Missing: RNG-based attribute setting in triggers (no `random` value source in effects)
- Missing: dynamic effect amounts from token attributes (effects use literal values, not refs)

**Feasibility**: Medium -- requires effect amounts that reference variables/attributes + RNG in effects

**Required Changes**:
- Wave 2: effect `amount` as expression/reference (not just literal number)
- Wave 2: `shuffle` or `random_set` effect for dice rolling
- Or Wave 1 workaround: simulate rolling via `set` with RNG-derived value in simulation engine

**Invariants**:
- INV-1: Pip values must be in valid range (1-6)
- INV-2: Dice must be rolled at round start (or per trigger)
- INV-3: Pip value affects placement legality and/or action strength
- INV-4: Dice rolling must use seeded RNG

**Tests**:
- T-1: Dice rolled at round start; values in 1-6 range
- T-2: Same seed produces same dice values
- T-3: Precondition checks pip value for placement
- T-4: Effect magnitude scales with pip value
- T-5: All dice reset/re-rolled each round

---

## Consolidated New Primitives

### New Scheduler Types (5)

| Scheduler | Description | Selection Logic | Wave |
|-----------|-------------|-----------------|------|
| `priority_queue` | Player with min/max of a variable acts next | `min(variable_id)` across players | 1 |
| `token_holder` | Player holding a specific token acts | Check token zone ownership | 1 |
| `simultaneous` | All players act in same phase (secret/parallel) | All players plan, then resolve | 2 |
| `random_draw` | Random player selection each step | Seeded RNG selects player index | 2 |
| `reactive` | Players act when conditions met, not in fixed order | Evaluate trigger conditions continuously | 3 |

**Schema Change** (`TurnDef.scheduler` enum):
```
Current:  ["round_robin", "custom"]
Proposed: ["round_robin", "priority_queue", "token_holder", "simultaneous", "random_draw", "reactive", "custom"]
```

**`priority_queue` additional fields**:
```json
{
  "scheduler": "priority_queue",
  "orderBy": { "variable": "time_position", "direction": "asc" }
}
```

**`token_holder` additional fields**:
```json
{
  "scheduler": "token_holder",
  "tokenType": "action_token",
  "zone": "active_player_zone"
}
```

**Implementation in `scheduler.js`**:
- `advanceTurnPhase()` currently returns `{ ok: false, reason: "unsupported-scheduler" }` for anything other than `round_robin`
- Each new scheduler needs a corresponding `advance*` function following the same pattern as `advanceRoundRobin()`

### New Effect Kinds (5)

| Effect Kind | Description | Parameters | Wave |
|-------------|-------------|------------|------|
| `conditional` | Branch effects based on condition | `condition: Expr`, `then: Effect[]`, `else?: Effect[]` | 1 |
| `choose` | Player selects from effect options | `options: Effect[][]`, `count: number` | 2 |
| `set_turn_order` | Reorder player sequence | `order: "by_variable"`, `variable: string`, `direction: "asc"\|"desc"` | 2 |
| `shuffle` | Randomize order of items | `target: Ref` (zone or phase list) | 2 |
| `transfer_token` | Move token between player zones | `tokenType: string`, `fromPlayer: Ref`, `toPlayer: Ref` | 1 (or extend `move`) |

**Schema additions to `Effect` oneOf**:
```json
{
  "kind": "conditional",
  "condition": { "$ref": "#/$defs/Expr" },
  "then": [{ "$ref": "#/$defs/Effect" }],
  "else": [{ "$ref": "#/$defs/Effect" }]
}
```

```json
{
  "kind": "choose",
  "options": [
    [{ "$ref": "#/$defs/Effect" }]
  ],
  "count": 1
}
```

```json
{
  "kind": "set_turn_order",
  "order": "by_variable",
  "variable": "string",
  "direction": "asc | desc"
}
```

```json
{
  "kind": "shuffle",
  "target": { "$ref": "#/$defs/Ref" }
}
```

**Alternative for `transfer_token`**: extend existing `move` effect with optional `toPlayer` field:
```json
{
  "kind": "move",
  "target": { "kind": "token", "id": "advantage" },
  "toZone": "player_zone",
  "toPlayer": "opponent"
}
```

### New Trigger Events (2 critical)

| Event | Description | Fires When | Wave |
|-------|-------------|------------|------|
| `start_round` | Beginning of a new round | All players have completed one cycle of turns | 1 |
| `end_round` | End of a complete round | After last player's turn, before next round starts | 1 |

**Schema change** (`TriggerDef.event` enum):
```
Current:  ["start_turn", "end_turn", "start_phase", "end_phase", "after_action", "state_change", "threshold"]
Proposed: ["start_turn", "end_turn", "start_phase", "end_phase", "start_round", "end_round", "after_action", "state_change", "threshold"]
```

**Implementation in `scheduler.js`**:
- Round boundary detection: when `nextPlayer` wraps back to `first_player`
- Fire `end_round` triggers before round boundary
- Fire `start_round` triggers after round boundary
- Track round number in `state.turn.round`

**State extension**:
```js
state.turn = {
  currentPlayer: 1,
  phase: null,
  turn: 1,
  round: 1  // NEW
}
```

### New Mutation Operators (8)

| Operator | Description | Targets | Wave |
|----------|-------------|---------|------|
| `scheduler-swap` | Change scheduler type | `turn.scheduler` | 1 |
| `scheduler-param-tweak` | Tweak scheduler parameters | `turn.orderBy`, `turn.tokenType` | 1 |
| `conditional-effect-insert` | Add conditional branching to existing effect | Any effect list | 1 |
| `turn-order-effect-insert` | Insert `set_turn_order` effect into triggers | `end_round` triggers | 2 |
| `choose-effect-insert` | Add player choice point in effect list | Any effect list | 2 |
| `round-trigger-add` | Add `start_round`/`end_round` trigger | `triggers[]` | 1 |
| `action-cost-tweak` | Modify action point costs | `actions[].costs[].amount` | 1 |
| `worker-count-tweak` | Change number of workers/tokens per player | Token spawn counts in setup | 2 |

**Location**: `src/evolutionary-engine/mutation/operators/`

**Registration**: `configs/evolution-operators.json` (add entries with `enabled: true/false`)

### Extended `move` Effect

Rather than adding a separate `transfer_token` effect, extend the existing `move` effect:

**Current `move`**:
```json
{ "kind": "move", "target": { "kind": "token", "id": "x" }, "toZone": "zone_id" }
```

**Extended `move`**:
```json
{ "kind": "move", "target": { "kind": "token", "id": "x" }, "toZone": "zone_id", "toPlayer": "opponent" }
```

**Schema change**: Add optional `toPlayer` to the `move` effect variant:
```json
{
  "kind": { "const": "move" },
  "target": { "$ref": "#/$defs/Ref" },
  "toZone": { "type": "string" },
  "toPlayer": { "type": "string", "enum": ["self", "opponent", "next", "previous"] }
}
```

**Implementation in `token-effects.js`**: `applyTokenMove()` resolves `toPlayer` to a player ID, then targets that player's instance of the specified zone.

---

## Implementation Priority Waves

### Wave 1 -- Foundation (13/27 mechanics enabled)

**Primitives added**:
1. `start_round` / `end_round` trigger events
2. `priority_queue` scheduler
3. `token_holder` scheduler
4. `conditional` effect
5. `move` `toPlayer` extension

**Files changed**:
| File | Changes |
|------|---------|
| `schemas/dsl/game-definition.v1.json` | Add trigger events, scheduler types, conditional effect, move toPlayer |
| `src/dsl/types.ts` | Mirror schema changes in TypeScript types |
| `src/game-kernel/scheduler.js` | Add `advancePriorityQueue()`, `advanceTokenHolder()`, round tracking, round trigger firing |
| `src/game-kernel/effect-application.js` | Add `applyConditional()` handler |
| `src/game-kernel/token-effects.js` | Extend `applyTokenMove()` with `toPlayer` resolution |
| `src/game-kernel/triggers.js` | Support `start_round` / `end_round` events |
| `src/simulation-engine/loop.js` | Handle new schedulers in simulation loop |
| `src/evolutionary-engine/mutation/operators/scheduler-swap.js` | New operator |
| `src/evolutionary-engine/mutation/operators/scheduler-param-tweak.js` | New operator |
| `src/evolutionary-engine/mutation/operators/conditional-effect-insert.js` | New operator |
| `src/evolutionary-engine/mutation/operators/round-trigger-add.js` | New operator |
| `src/evolutionary-engine/mutation/operators/action-cost-tweak.js` | New operator |
| `configs/evolution-operators.json` | Register new operators |

**Mechanics enabled (full or near-full)**:
1. Action Points (already full)
2. Action Drafting (full with `start_round`)
3. Action / Event (near-full with `conditional`)
4. Action Retrieval (full with current primitives)
5. Advantage Token (full with `move toPlayer`)
6. Command Cards (full with flags)
7. Follow (full with phases + variables)
8. Order Counters (full with `priority_queue` + `conditional`)
9. Passed Action Token (full with `token_holder`)
10. Progressive (full with `end_round` + scheduler enhancement)
11. Time Track (full with `priority_queue`)
12. Variable Phase Order (full with preconditions workaround)
13. Worker Placement (full with `start_round`)

### Wave 2 -- Dynamic Order & Choice (22/27 mechanics enabled)

**Primitives added**:
1. `simultaneous` scheduler
2. `choose` effect
3. `set_turn_order` effect
4. `random_draw` scheduler
5. `shuffle` effect

**Files changed**:
| File | Changes |
|------|---------|
| `schemas/dsl/game-definition.v1.json` | Add scheduler types, new effects |
| `src/dsl/types.ts` | Mirror changes |
| `src/game-kernel/scheduler.js` | Add `advanceSimultaneous()`, `advanceRandomDraw()` |
| `src/game-kernel/effect-application.js` | Add `applyChoose()`, `applySetTurnOrder()`, `applyShuffle()` |
| `src/simulation-engine/loop.js` | Handle simultaneous planning/resolution flow |
| `src/evolutionary-engine/mutation/operators/turn-order-effect-insert.js` | New operator |
| `src/evolutionary-engine/mutation/operators/choose-effect-insert.js` | New operator |
| `src/evolutionary-engine/mutation/operators/worker-count-tweak.js` | New operator |

**Additional mechanics enabled**:
14. Auction (full with `set_turn_order` + `end_round`)
15. Claim Action (full with `set_turn_order` + `end_round`)
16. Pass Order (full with `set_turn_order` + scheduler skip)
17. Programmed Movement (full with `simultaneous`)
18. Random (full with `random_draw`)
19. Role Order (full with `simultaneous` + `set_turn_order`)
20. Simultaneous Action Selection (full with `simultaneous`)
21. Stat-Based (full with `set_turn_order` + `start_round`)
22. Worker Placement with Dice (near-full with `shuffle`/random-set + variable-ref amounts)

### Wave 3 -- Specialized (27/27 mechanics enabled)

**Primitives added**:
1. `reactive` scheduler (interrupt support)
2. Queue effects (`queue_push`, `queue_pop`) or ordered-zone index access
3. Multi-hop `move_spatial` (distance parameter)
4. Directional spatial edges (or forward-only constraint)
5. Expression arithmetic (modulo for impulse calculation)
6. Effect amounts as expressions (ref-based, not just literals)

**Files changed**:
| File | Changes |
|------|---------|
| `schemas/dsl/game-definition.v1.json` | Reactive scheduler, queue effects, spatial extensions, expr arithmetic |
| `src/dsl/types.ts` | Mirror changes |
| `src/game-kernel/scheduler.js` | Add `advanceReactive()` with interrupt stack |
| `src/game-kernel/effect-application.js` | Add queue effects, multi-hop spatial, expression-based amounts |
| `src/game-kernel/effects.js` | Extend `evaluateExpr()` with arithmetic operators |
| `src/simulation-engine/loop.js` | Handle reactive scheduling, interrupt windows |

**Remaining mechanics enabled**:
23. Action Queue (full with queue effects)
24. Action Timer (full with `reactive` scheduler)
25. Impulse Movement (full with modulo expressions)
26. Interrupts (full with `reactive` + interrupt stack)
27. Rondel (full with multi-hop spatial + directional edges)

---

## Coverage Matrix

| # | Mechanic | Current | Wave 1 | Wave 2 | Wave 3 |
|---|----------|---------|--------|--------|--------|
| 1 | Action Drafting | Partial | **Full** | Full | Full |
| 2 | Action / Event | Partial | **Near-Full** | Full | Full |
| 3 | Action Points | **Full** | Full | Full | Full |
| 4 | Action Queue | Partial | Partial | Partial | **Full** |
| 5 | Action Retrieval | Partial | **Full** | Full | Full |
| 6 | Action Timer | Minimal | Minimal | Partial | **Full** |
| 7 | Advantage Token | Partial | **Full** | Full | Full |
| 8 | Auction | Minimal | Partial | **Full** | Full |
| 9 | Claim Action | Partial | Partial | **Full** | Full |
| 10 | Command Cards | Partial | **Full** | Full | Full |
| 11 | Follow | Partial | **Full** | Full | Full |
| 12 | Impulse Movement | Minimal | Minimal | Minimal | **Full** |
| 13 | Interrupts | Minimal | Minimal | Minimal | **Full** |
| 14 | Order Counters | Minimal | **Full** | Full | Full |
| 15 | Passed Action Token | Minimal | **Full** | Full | Full |
| 16 | Pass Order | Minimal | Partial | **Full** | Full |
| 17 | Programmed Movement | Minimal | Minimal | **Full** | Full |
| 18 | Progressive | Mostly | **Full** | Full | Full |
| 19 | Random | None | None | **Full** | Full |
| 20 | Role Order | Minimal | Minimal | **Full** | Full |
| 21 | Rondel | Partial | Partial | Partial | **Full** |
| 22 | Simultaneous Action Selection | None | None | **Full** | Full |
| 23 | Stat-Based | Minimal | Partial | **Full** | Full |
| 24 | Time Track | Minimal | **Full** | Full | Full |
| 25 | Variable Phase Order | Partial | **Full** | Full | Full |
| 26 | Worker Placement | Partial | **Full** | Full | Full |
| 27 | Worker Placement w/ Dice | Partial | Partial | **Near-Full** | Full |

**Summary**:
- **Wave 1** (4 primitives): 1 already full + 12 newly full = **13/27 full**
- **Wave 2** (5 primitives): 13 + 9 = **22/27 full**
- **Wave 3** (6 primitives): 22 + 5 = **27/27 full**
