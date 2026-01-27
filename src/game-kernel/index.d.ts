export type {
  AgentState,
  GameState,
  GlobalZoneState,
  PerPlayerZoneState,
  StateVariables,
  TokenInstance,
  TurnState,
  ZoneState,
  ZoneStateBase,
} from "./state.js";

export { allocateTokenId, createInitialState } from "./state.js";
export type { ActionContext, ActionValidationResult, BoundsMode } from "./actions.js";
export { isActionLegal, listLegalActions, validateActionChoice } from "./actions.js";
export type { SchedulerStepResult } from "./scheduler.js";
export { advanceTurnPhase } from "./scheduler.js";
export type { TriggerContext, TriggerResult } from "./triggers.js";
export { applyTriggers } from "./triggers.js";
export type { ApplyEffectOptions, EffectContext, EffectResult } from "./effects.js";
export { applyEffect, buildVariableIndex, evaluateExpr } from "./effects.js";
export type { GameEvent, StateUpdateEvent, TerminationEvent } from "./events.js";
export { createEventStream, recordStateUpdate, recordTermination } from "./events.js";
export type { OutcomeType, TerminationOptions, TerminationResult } from "./termination.js";
export { evaluateTermination } from "./termination.js";
