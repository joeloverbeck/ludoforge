import type { Effect, Expr, GameDefinition, VariableDef } from "../dsl/types.js";
import type { GameState } from "./state.js";

export interface EffectContext {
  state: GameState;
  playerId?: number;
  phase?: string | null;
  variableIndex: Map<string, VariableDef>;
  impact?: EffectImpact;
}

export interface ApplyEffectOptions {
  boundsMode?: "reject" | "clamp";
}

export interface ResolvedRef {
  kind: "var";
  id: string;
  scope: string;
}

export interface AppliedEffect {
  kind: string;
  target: ResolvedRef;
  value?: unknown;
  amount?: number;
  source?: "cost" | "effect" | "trigger";
}

export interface EffectResult {
  ok: boolean;
  reason?: string;
  clamped?: boolean;
  appliedEffect?: AppliedEffect;
}

export interface EffectImpact {
  affectedPlayerIds: Set<number>;
  affectedGlobal: boolean;
}

export function buildVariableIndex(definition: GameDefinition): Map<string, VariableDef>;

export function evaluateExpr(expr: Expr | undefined, context: EffectContext): boolean;

export function applyEffect(
  state: GameState,
  effect: Effect,
  context: EffectContext,
  options?: ApplyEffectOptions
): EffectResult;
