import type { GameDefinition, PlayersDef, ScalarValue, ZoneDef } from "../dsl/types.js";

export interface StateVariables {
  global: Record<string, ScalarValue>;
  perPlayer: Record<number, Record<string, ScalarValue>>;
}

export interface TokenInstance {
  id: string;
  type: string;
  attributes: Record<string, ScalarValue>;
}

export interface ZoneStateBase {
  id: string;
  tokenType: string;
  scope: "global" | "per_player";
  order: "ordered" | "unordered";
  visibility: "public" | "private";
  spatial?: ZoneDef["spatial"];
}

export interface GlobalZoneState extends ZoneStateBase {
  scope: "global";
  tokens: string[];
}

export interface PerPlayerZoneState extends ZoneStateBase {
  scope: "per_player";
  tokensByPlayer: Record<number, string[]>;
}

export type ZoneState = GlobalZoneState | PerPlayerZoneState;

export interface AgentState {
  id: number;
  role?: string;
  team?: number;
  variables: Record<string, ScalarValue>;
}

export interface TurnState {
  currentPlayer: number;
  phase: string | null;
  turn: number;
}

export interface GameState {
  variables: StateVariables;
  tokens: Record<string, TokenInstance>;
  zones: Record<string, ZoneState>;
  agents: AgentState[];
  turn: TurnState;
  nextTokenId: number;
}

export function createInitialState(definition: GameDefinition): GameState;
export function allocateTokenId(state: GameState): string;

export {};
