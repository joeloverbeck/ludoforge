# Game Design DSL Spec

## Purpose
Provide a compact, typed, evolvable representation of tabletop games. Serves as the "genome" for evolution and as executable input to the kernel.

## Representation
- Canonical internal form: AST with type information.
- External form (MVP): JSON-based DSL with a versioned schema.
- Optional later: textual DSL that parses into the same AST.
- Must support deterministic serialization for caching and comparison.

## JSON Schema Outline (First Pass)
The schema is versioned and composed of clearly defined sections. This is a structural outline, not full JSON Schema syntax.

```
GameDefinition:
  version: string (e.g., "1.0")
  players:
    count: int >= 1
    roles?: string[]
    teams?: string[][]
  state:
    variables: VariableDef[]
    tokenTypes?: TokenTypeDef[]
    zones?: ZoneDef[]
  actions: ActionDef[]
  turn:
    scheduler: "round_robin" | "custom"
    phases?: string[]
    stepEffects?: TriggerDef[]
  termination:
    conditions: TerminationDef[]
    maxTurns?: int
    scoring?: ScoreDef
  triggers?: TriggerDef[]

VariableDef:
  id: string
  scope: "global" | "per_player"
  type:
    kind: "int" | "bool" | "enum"
    min?: int
    max?: int
    values?: string[]
  initial: number | boolean | string

TokenTypeDef:
  id: string
  attributes: VariableDef[]

ZoneDef:
  id: string
  tokenType: string
  scope: "global" | "per_player"
  order: "ordered" | "unordered"
  visibility: "public" | "private"
  spatial?: {
    nodes: string[]
    edges: [string, string][]
  }

ActionDef:
  id: string
  actor: "any" | "player" | "role" | "environment"
  actorRole?: string
  preconditions?: Expr
  costs?: Effect[]
  effects: Effect[]
  targets?: TargetDef[]
  metadata?: {
    phase?: string
    speed?: "normal" | "reaction"
  }

TargetDef:
  id: string
  kind: "token" | "player" | "zone"
  selector: SelectorDef

SelectorDef:
  where?: Expr
  zone?: string
  tokenType?: string
  player?: "self" | "opponent" | "any"
  count?: number
  random?: boolean

Effect:
  kind: "set" | "inc" | "dec" | "move" | "spawn" | "destroy" | "reveal" | "hide" | "random" | "foreach"
  target: Ref
  value?: number | boolean | string
  amount?: number
  toZone?: string

TriggerDef:
  event: "start_turn" | "end_turn" | "start_phase" | "end_phase" | "after_action" | "state_change" | "threshold"
  condition?: Expr
  effects: Effect[]

TerminationDef:
  condition: Expr
  outcome:
    type: "win" | "lose" | "draw"
    players?: "all" | "active" | number[]

ScoreDef:
  perPlayer: Expr

Expr:
  kind: "and" | "or" | "not" | "cmp" | "value" | "ref"
  op?: "==" | "!=" | "<" | "<=" | ">" | ">="
  left?: Expr
  right?: Expr
  value?: number | boolean | string
  ref?: Ref

Ref:
  kind: "var" | "token" | "zone" | "player"
  id: string
  attribute?: string
```

Notes:
- This outline favors simple, bounded operations and minimal arithmetic.
- A full schema will enforce required fields and cross-references.
- `random` effects must be bounded and reproducible via the engine RNG; they can choose among discrete options or sample within declared ranges.
- `foreach` effects apply a bounded sub-effect to a bounded target set (e.g., all tokens in a zone or all players).

## Sections
1. Players/Agents
   - N (int >= 1)
   - Optional roles/teams
   - Payoff scheme (shared or per-agent)

2. State
   - Variables: int[min..max], bool, enum{...}
   - Token types: attributes (typed vars)
   - Zones: typed token containers with properties
     - ordered/unordered
     - public/private
     - spatial (graph nodes, adjacency)

3. Actions
   - Name (optional)
   - Actor scope (any player, specific role, environment)
   - Preconditions: boolean expressions over state
   - Costs: effects that must be applied first
   - Effects: bounded primitive operations
   - Target selectors: choose token/zone/player with constraints
   - Optional metadata (phase tags, timing)

4. Turn Structure
   - Scheduler (default: round-robin)
   - Phases (optional list)
   - Automatic step effects at phase boundaries
   - If scheduler is `custom`, the game must define explicit phase order and any non-round-robin actor order in the `turn` section (e.g., via phases + stepEffects + actor selection rules).

5. Termination
   - Win/lose conditions (boolean expressions)
   - Max turns (failsafe)
   - Optional scoring function for terminal ranking

6. Triggers
   - Event hooks (start/end phase, after action, state change/threshold)
   - Condition + effect lists
   - Loop safety (no immediate self-recursion)

## Constraints
- All references must resolve to declared names and types.
- All operations must be bounded (no unbounded token spawn or resource growth).
- Every game must include at least one termination condition (max turns is a failsafe, not a substitute).
- Variables/tokens must be used by at least one rule or condition.
- Int values are clamped to their declared bounds at all times.

## Evolutionary Friendliness
- AST nodes are mutation targets (add/remove/modify).
- Strong typing enables syntactically valid mutations.
- Small primitives to increase combinatorial diversity.

## Rationale
- JSON + schema is the most robust, testable, and evolvable starting point.
- It enables strict validation, stable serialization, and easy tooling.
- A textual DSL can be added later without changing execution semantics.

## Testing
- Run `tsc -p tsconfig.json` to type-check the DSL AST types in `src/dsl/` and the type-level tests in `test/dsl/`.

## Open Questions
- Level of arithmetic allowed in expressions (constants only vs simple ops).
