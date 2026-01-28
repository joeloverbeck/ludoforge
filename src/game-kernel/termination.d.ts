import type { Expr, GameDefinition, ScalarValue } from "../dsl/types.js";
import type { GameState } from "./state.js";
import type { GameEvent } from "./events.js";

export type OutcomeType = "win" | "lose" | "draw";

export interface TerminationResult {
  terminated: boolean;
  reason?: "condition" | "max-turns" | "no-legal-actions" | "no-legal-actions-error" | (string & {});
  conditionIndex?: number;
  outcomes?: Record<number, OutcomeType>;
  scores?: Record<number, ScalarValue>;
}

export interface TerminationMeta {
  legalActionCount?: number;
  hasLegalActions?: boolean;
}

export interface TerminationOptions {
  activePlayerId?: number;
  maxTurnsReached?: boolean;
  events?: GameEvent[];
  meta?: TerminationMeta;
}

export function computeScoresAtState(
  definition: GameDefinition,
  state: GameState
): Record<number, ScalarValue> | undefined;

export function evaluateTermination(
  definition: GameDefinition,
  state: GameState,
  options?: TerminationOptions
): TerminationResult;

export {}; // ensure this is a module
