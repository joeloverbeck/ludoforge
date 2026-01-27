import type { GameDefinition, TriggerDef } from "../dsl/types.js";
import type { GameState } from "./state.js";

export interface TriggerContext {
  playerId?: number;
  phase?: string | null;
}

export interface TriggerResult {
  ok: boolean;
  reason?: string;
  fired?: boolean;
  iterations?: number;
}

export function applyTriggers(
  definition: GameDefinition,
  state: GameState,
  event: TriggerDef["event"],
  context?: TriggerContext
): TriggerResult;
