import type { GameDefinition } from "../dsl/types.js";
import type { GameState } from "./state.js";

export interface SchedulerStepResult {
  ok: boolean;
  reason?: string;
  failsafe?: {
    type: "win" | "lose" | "draw";
    players?: "all" | "active" | number[];
  };
}

export function advanceTurnPhase(
  definition: GameDefinition,
  state: GameState,
  options?: {
    maxTurns?: number;
    maxStepsPerTurn?: number;
    maxTriggerDepth?: number;
    stateHistoryLimit?: number;
  }
): SchedulerStepResult;
