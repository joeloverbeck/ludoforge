import type { ScalarValue, ZoneDef } from "../dsl/types.js";

export interface RenderZone {
  id: string;
  tokenType: string;
  scope: "global" | "per_player";
  order: "ordered" | "unordered";
  visibility: "public" | "private";
  spatial?: ZoneDef["spatial"];
  tokens?: string[];
  tokensByPlayer?: Record<number, string[]>;
}

export interface RenderState {
  variables: {
    global: Record<string, ScalarValue>;
    perPlayer: Record<number, Record<string, ScalarValue>>;
  };
  zones: Record<string, RenderZone>;
  turn: {
    currentPlayer: number;
    phase: string | null;
    turn: number;
  };
}

export interface RenderOptions {
  collapseLimit?: number;
}

export interface RenderInput {
  state: RenderState;
  previousState?: RenderState;
  viewerPlayerId?: number;
  options?: RenderOptions;
}

export function renderState(input: RenderInput): string;
