import type { ActionDef } from "../dsl/types.js";

export interface HumanIO {
  readLine(): Promise<string>;
  writeLine(line: string): void;
}

export interface ActionPromptResult {
  action: ActionDef;
  index: number;
}

export interface ActionPromptInput {
  legalActions: ActionDef[];
  io: HumanIO;
  promptLabel?: string;
}

export function renderActionList(legalActions: ActionDef[]): string;
export function promptForAction(input: ActionPromptInput): Promise<ActionPromptResult>;
