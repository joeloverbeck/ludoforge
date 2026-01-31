export type ScalarValue = number | boolean | string;

export interface GameDefinition {
  version: string;
  players: PlayersDef;
  state: StateDef;
  actions: ActionDef[];
  turn: TurnDef;
  termination: TerminationBlock;
  triggers?: TriggerDef[];
}

export interface PlayersDef {
  count: number;
  roles?: string[];
  teams?: string[][];
}

export interface StateDef {
  variables: VariableDef[];
  tokenTypes?: TokenTypeDef[];
  zones?: ZoneDef[];
}

export interface VariableDef {
  id: string;
  scope: "global" | "per_player";
  type: VariableTypeDef;
  initial: ScalarValue;
}

export type VariableTypeDef =
  | { kind: "int"; min?: number; max?: number }
  | { kind: "bool" }
  | { kind: "enum"; values?: string[] };

export interface TokenTypeDef {
  id: string;
  attributes: VariableDef[];
}

export interface SpatialEdge {
  from: string;
  to: string;
  direction?: "forward" | "backward" | "both";
}

export interface ZoneDef {
  id: string;
  tokenType: string;
  scope: "global" | "per_player";
  order: "ordered" | "unordered";
  visibility: "public" | "private";
  spatial?: {
    nodes: string[];
    edges: SpatialEdge[];
  };
}

export interface ActionDef {
  id: string;
  actor: "any" | "player" | "role" | "environment";
  actorRole?: string;
  preconditions?: Expr;
  costs?: Effect[];
  effects: Effect[];
  targets?: TargetDef[];
  params?: ParamDef[];
  metadata?: {
    phase?: string;
    speed?: "normal" | "reaction";
  };
}

export interface TargetDef {
  id: string;
  kind: "token" | "player" | "zone";
  selector: SelectorDef;
}

export interface SelectorDef {
  where?: Expr;
  zone?: string;
  tokenType?: string;
  player?: "self" | "opponent" | "any";
  count?: number;
}

export interface TokenParamDomain {
  selector: SelectorDef;
}

export interface PlayerParamDomain {
  values: "self" | "opponent" | "any" | number[];
}

export interface ZoneParamDomain {
  values: string[];
}

export interface ParamDef {
  id: string;
  kind: "token" | "player" | "zone";
  domain: TokenParamDomain | PlayerParamDomain | ZoneParamDomain;
  count?: number;
  unique?: boolean;
}

export type Effect =
  | { kind: "set"; target: Ref; value?: ScalarValue }
  | { kind: "inc"; target: Ref; amount?: number | Expr }
  | { kind: "dec"; target: Ref; amount?: number | Expr }
  | { kind: "move"; target: Ref; toZone?: string; toPlayer?: "self" | "opponent" | "next" | "previous" }
  | { kind: "spawn"; target: Ref; toZone?: string }
  | { kind: "destroy"; target: Ref }
  | { kind: "reveal"; target: Ref }
  | { kind: "hide"; target: Ref }
  | { kind: "move_spatial"; target: Ref; zone: string; toNode?: string; distance?: number }
  | { kind: "repeat"; effects: Effect[]; count: number }
  | { kind: "conditional"; condition: Expr; then: Effect[]; else?: Effect[] }
  | { kind: "set_flag"; target: Ref; flag: string; duration?: "action" | "phase" | "turn" | "round" }
  | { kind: "set_turn_order"; order: "by_variable"; variable: string; direction: "asc" | "desc" }
  | { kind: "rng_choose"; options: Effect[][]; count?: number }
  | { kind: "shuffle"; target: Ref }
  | { kind: "queue_push"; target: Ref; toZone: string }
  | { kind: "queue_pop"; fromZone: string; toZone?: string }
;

export interface TriggerDef {
  event:
    | "start_turn"
    | "end_turn"
    | "start_phase"
    | "end_phase"
    | "start_round"
    | "end_round"
    | "after_action"
    | "state_change"
    | "threshold";
  condition?: Expr;
  effects: Effect[];
}

export interface TurnDef {
  scheduler: "round_robin" | "priority_queue" | "token_holder" | "simultaneous" | "random_draw" | "reactive" | "custom";
  resolution?: { order: "by_player_id" | "random" };
  orderBy?: { variable: string; direction: "asc" | "desc" };
  tokenType?: string;
  zone?: string;
  phases?: string[];
  stepEffects?: TriggerDef[];
  noLegalActions?: NoLegalActionsDef;
}

export interface TerminationBlock {
  conditions: TerminationDef[];
  maxTurns?: number;
  scoring?: ScoreDef;
}

export interface TerminationDef {
  condition: Expr;
  outcome: TerminationOutcome;
}

export interface TerminationOutcome {
  type: "win" | "lose" | "draw";
  players?: "all" | "active" | number[];
}

export type NoLegalActionsDef =
  | { policy: "terminate"; defaultOutcome: TerminationOutcome; reason?: string }
  | { policy: "pass"; reason?: string }
  | { policy: "error"; reason?: string };

export interface ScoreDef {
  perPlayer: Expr;
}

export type Expr =
  | { kind: "and"; left?: Expr; right?: Expr }
  | { kind: "or"; left?: Expr; right?: Expr }
  | { kind: "not"; value?: Expr }
  | { kind: "cmp"; op?: "==" | "!=" | "<" | "<=" | ">" | ">="; left?: Expr; right?: Expr }
  | { kind: "arith"; op?: "+" | "-" | "*" | "/" | "%"; left?: Expr; right?: Expr }
  | { kind: "value"; value?: ScalarValue }
  | { kind: "ref"; ref?: ExprRef };

export type MetaRef = { kind: "meta"; id: "legalActionCount" | "hasLegalActions" };

export type ExprRef = Ref | MetaRef;

export type Ref =
  | { kind: "var"; id: string; attribute?: string }
  | { kind: "token"; id: string; attribute?: string }
  | { kind: "zone"; id: string; attribute?: string }
  | { kind: "player"; id: string; attribute?: string };
