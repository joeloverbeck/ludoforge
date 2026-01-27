import type { GameState } from "./state.js";
import type { TerminationResult } from "./termination.js";

export interface StateUpdateEvent {
  type: "state_update";
  turn: GameState["turn"];
  context: Record<string, unknown>;
}

export interface TerminationEvent {
  type: "termination";
  reason?: TerminationResult["reason"];
  conditionIndex?: TerminationResult["conditionIndex"];
  outcomes?: TerminationResult["outcomes"];
  scores?: TerminationResult["scores"];
}

export type GameEvent = StateUpdateEvent | TerminationEvent;

export function createEventStream(): GameEvent[];

export function recordStateUpdate(
  events: GameEvent[],
  state: GameState,
  context?: Record<string, unknown>
): void;

export function recordTermination(events: GameEvent[], result: TerminationResult): void;
