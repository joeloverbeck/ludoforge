import type { ActionDef, GameDefinition } from "../dsl/types.js";
import type { ActionContext } from "../game-kernel/actions.js";
import type { GameState } from "../game-kernel/state.js";
import type { HumanIO } from "./prompt.js";

export interface ActionProviderInput {
  definition: GameDefinition;
  state: GameState;
  legalActions: ActionDef[];
  context: ActionContext;
}

export type ActionProvider =
  | ((input: ActionProviderInput) => ActionDef | string | undefined)
  | { selectAction(input: ActionProviderInput): ActionDef | string | undefined };

export interface HumanParticipant {
  kind: "human";
  playerId: number;
  name?: string;
  promptLabel?: string;
  io: HumanIO;
}

export interface AiParticipant {
  kind: "ai";
  playerId: number;
  name?: string;
  actionProvider: ActionProvider;
}

export type Participant = HumanParticipant | AiParticipant;

export interface RouteTurnInput {
  definition: GameDefinition;
  state: GameState;
  previousState?: GameState;
  context?: ActionContext;
  participants: Participant[];
}

export interface RouteTurnResult {
  action: ActionDef;
  index: number;
  participant: Participant;
  legalActions: ActionDef[];
}

export function routeTurn(input: RouteTurnInput): Promise<RouteTurnResult>;
