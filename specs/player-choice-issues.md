# Player Choice Issues

We fed our architectural docs to ChatGPT so it could find bugs or possible improvements. It said:

"Limiting player choice in action modeling
The action model restricts player decisions, blocking key mechanics like choosing which cards to play or units to attack, due to rigid target resolution."

## Is the claim valid?

In your current design, the agent picks an action id (or action object), and then the engine resolves targets for that action by running selectors. The key point: target selection is not a player/agent decision; it’s kernel-side auto-binding.

- The simulation loop explicitly does: (6) ask agent for action id/object, then (7) validate legality including resolving selectors, then (8) resolve selectors into bindings. 
 
- Your selector system is defined as “filters tokens… optional random shuffle… count limit,” and resolveActionTargets “resolves all selectors… and returns a bindings object.” 

- In the DSL, ActionDef.targets is just { id, kind, selector } with selector fields like where, zone, tokenType, player, count, random. There is no concept of “the player chooses among the candidates.”

So yes: mechanics like “attack that unit,” “play this card,” “choose one of these legal targets” cannot be represented cleanly unless you explode them into separate actions or rely on selector randomness. That’s exactly the limitation the critique is pointing at.

Also: your effect kind named choose is not actually player choice — it selects options via RNG (“deterministic simulation via context.rng”). That’s a naming/semantic footgun if anyone reads it as “the player chooses.”

## Would fixes be better than the current implementation?

Yes, if your goal is “model real tabletop decision-making” and evolve games for “fun.” Right now your system systematically under-represents decision space:

- Your analytics treat “choice” as legalActionCount > 1 (agency, strategic depth proxies). 

- But legalActionCount currently counts actions, not parameterized action choices (“attack unit A/B/C” all look like one action). 

That distorts both gameplay modeling and fitness signals.

The tradeoff is real: parameterized choices can blow up branching factor. But you can handle that cleanly with explicit parameter domains + caps/sampling (and it actually makes your metrics more honest).

## Spec: Explicit Player Choice for Targets (Breaking Change, No Back-Compat)

### 1) What needs to change

#### 1.1 Replace “auto target resolution” with “action arguments”
**Goal:** The *agent* chooses targets; the kernel only validates and applies.

- Remove `ActionDef.targets` entirely.
- Introduce `ActionDef.params` (aka action arguments) where each param describes a *domain* of valid choices.
- An agent’s action selection becomes:
  - `ActionChoice := { actionId: string, args: Record<paramId, ArgValue> }`
  - `ArgValue` is one of:
    - token instance id (string)
    - player id (integer)
    - zone id (string)
    - array of the above when `count > 1`

##### New DSL shape
- `action.params[]`:
  - `id: string`
  - `kind: "token" | "player" | "zone"`
  - `domain`:
    - for `token`: `{ selector: SelectorDef }`
    - for `player`: `{ values: ("self"|"opponent"|"any") | explicitIds?: number[] }`
    - for `zone`: `{ values?: string[] }`
  - `count?: integer` (default 1)
  - `unique?: boolean` (default true when count>1)
  - **Remove** `selector.random` from the DSL (randomness belongs in agent policy, not kernel binding).

#### 1.2 Kernel API changes (simulation-engine)
- Replace `resolveActionTargets(action.targets)` with:
  - `resolveParamDomains(action.params, state, context) -> domains`
  - `validateActionChoice(choice, domains, state)` ensures:
    - required args are present
    - chosen values are members of computed domains
    - token ids exist and are in the correct zone/type constraints
- Effects continue to reference bindings via `context.bindings`, but those bindings now come from `choice.args`, not kernel selector auto-picks.

#### 1.3 Decision-space accounting (legalActionCount)
- Change the meaning of `legalActionCount`:
  - It must count **distinct player choices**, not just action templates.
- Define per-step:
  - For each legal action template `a`, compute `choices(a) = product(domainSize(param_i))`.
  - `legalActionCount = sum_a choices(a)`, with a hard cap `MAX_DECISION_SPACE` (configurable).
- Record optional diagnostics:
  - `decisionSpaceCapped: boolean`
  - `decisionSpaceRaw?: number` (only when below cap)

#### 1.4 Agent contract changes
- Agents must receive enough info to choose args:
  - `getAction(state, legalMoves)` where `legalMoves` includes:
    - `actionId`
    - `domainsByParamId` (explicit candidate lists or counts + iterator hooks)
- Random/greedy baseline agents must be updated to select args explicitly.

#### 1.5 Fix misleading naming: `choose` effect
- Rename effect kind `choose` -> `rng_choose` (or similar).
- Semantics remain RNG-based branching.
- Hard rule: **no nested “player decisions” inside effect application**.
  - All player agency lives in top-level action selection + args.

---

### 2) What invariants should pass

#### Determinism
- Given identical seed + identical agents, simulations are bit-for-bit reproducible.
- No kernel-side randomness is used to pick targets or action args.

#### No hidden auto-binding
- If an action has `params`, the kernel MUST NOT pick args implicitly.
- Missing/invalid args cause action rejection (or agent retry), never silent substitution.

#### Legality consistency
- If `listLegalMoves()` exposes a move, `applyMove()` must accept it (unless state changed).
- Cost feasibility checks are evaluated with the chosen args (not with hypothetical or first-match bindings).

#### Metrics integrity
- `legalActionCount` reflects parameterized choices.
- Agency/strategic-depth proxies move in the expected direction when adding target options.

#### Bounded complexity
- Decision-space explosion is controlled by:
  - capping `legalActionCount`
  - optionally sampling/limiting domain enumeration for agents while keeping counts accurate up to cap

---

### 3) What tests should pass

#### Schema & validation
1. `game-definition.v1.schema` rejects any definition that contains `action.targets`.
2. `action.params` requires `id/kind/domain` and validates domain structure by kind.
3. Selector validation still works for `domain.selector` (zone/tokenType/where).

#### Simulation legality & execution
4. **Single-target token param**
   - State has 3 enemy tokens matching selector.
   - Action `attack` with param `{id:"t", kind:"token", domain.selector: ... }`
   - Agent chooses each token id in turn.
   - Each choice is accepted and affects the chosen token only.
5. **Invalid arg rejection**
   - Agent supplies a token id not in the selector domain.
   - `validateActionChoice` rejects deterministically with a structured error.
6. **Multi-select param**
   - Param `count=2, unique=true`.
   - Domain has 3 candidates.
   - Choosing 2 distinct is legal; choosing duplicates is illegal.

#### Decision-space counting
7. `legalActionCount` equals sum of choice products:
   - Two actions: one with 3 targets, one with 2 targets => `legalActionCount=5`
   - One action with 3 targets and second param with 4 targets => `legalActionCount=12`
8. Cap behavior:
   - When raw count exceeds cap, `legalActionCount == cap` and `decisionSpaceCapped==true`.

#### Analytics correctness (core metrics)
9. Agency increases when target domains increase (same action templates, more arg choices).
10. Strategic depth proxy (avg legalActionCount) tracks increased branching.

#### RNG-branching rename
11. Definitions using `rng_choose` execute deterministically with seeded RNG.
12. Any legacy `choose` effect kind is rejected by schema (no aliases, no back-compat).