import type { GameDefinition } from "../dsl/types.js";
import type { ActionContext } from "../game-kernel/actions.js";
import type { GameState } from "../game-kernel/state.js";
import type { ActionPromptResult, HumanIO } from "./prompt.js";

export interface HumanTurnInput {
  definition: GameDefinition;
  state: GameState;
  context?: ActionContext;
  io: HumanIO;
  promptLabel?: string;
}

export function runHumanTurn(input: HumanTurnInput): Promise<ActionPromptResult>;
