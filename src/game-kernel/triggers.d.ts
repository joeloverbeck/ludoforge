import type { GameDefinition, TriggerDef } from "../dsl/types.js";
import type { GameState } from "./state.js";
import type { EffectImpact } from "./effects.js";

export interface TriggerContext {
  playerId?: number;
  phase?: string | null;
  guard?: TriggerGuard;
  impact?: EffectImpact;
}

export interface TriggerGuard {
  depth?: number;
  maxDepth?: number;
  steps?: number;
  maxSteps?: number;
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
