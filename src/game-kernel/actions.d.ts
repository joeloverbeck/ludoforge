import type { ActionDef, GameDefinition } from "../dsl/types.js";
import type { GameState } from "./state.js";

export interface ActionContext {
  playerId?: number;
  phase?: string | null;
}

export type BoundsMode = "reject" | "clamp";

export interface ActionValidationResult {
  ok: boolean;
  reason?: string;
  clamped?: boolean;
}

export function isActionLegal(
  definition: GameDefinition,
  state: GameState,
  action: ActionDef,
  context?: ActionContext
): boolean;

export function listLegalActions(
  definition: GameDefinition,
  state: GameState,
  context?: ActionContext
): ActionDef[];

export function validateActionChoice(
  definition: GameDefinition,
  state: GameState,
  actionId: string,
  context?: ActionContext,
  options?: { bounds?: BoundsMode }
): ActionValidationResult;
