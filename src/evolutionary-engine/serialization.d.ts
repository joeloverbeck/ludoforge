import type { GameDefinition } from "../dsl/types.js";
import type { SemanticIssue } from "../dsl/semantic.js";
import type { ValidationError } from "../dsl/validate.js";

export interface GenomeValidationResult {
  valid: boolean;
  errors: ValidationError[];
  issues: SemanticIssue[];
}

export function serializeGenome(definition: GameDefinition): string;
export function validateGenomeDefinition(definition: GameDefinition): GenomeValidationResult;
export function createGenomeId(definition: GameDefinition): string;
