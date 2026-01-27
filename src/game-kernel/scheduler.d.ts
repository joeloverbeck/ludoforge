import type { GameDefinition } from "../dsl/types.js";
import type { GameState } from "./state.js";

export interface SchedulerStepResult {
  ok: boolean;
  reason?: string;
}

export function advanceTurnPhase(
  definition: GameDefinition,
  state: GameState,
  options?: { maxTurns?: number }
): SchedulerStepResult;
