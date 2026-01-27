import type { ScalarValue } from "../dsl/types.js";

export interface VariableChange {
  key: string;
  from: ScalarValue;
  to: ScalarValue;
}

export interface TokenDelta {
  added: string[];
  removed: string[];
}

export function diffVariables(
  prevVariables: Record<string, ScalarValue> | undefined,
  nextVariables: Record<string, ScalarValue> | undefined,
): VariableChange[];

export function diffZoneTokens(
  prevTokens: string[] | undefined,
  nextTokens: string[] | undefined,
): TokenDelta;
