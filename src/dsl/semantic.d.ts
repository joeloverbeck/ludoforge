export interface SemanticIssue {
  path: string;
  message: string;
  rule: string;
}

export function collectSemanticIssues(definition: unknown): SemanticIssue[];

export interface SemanticValidationResult {
  valid: boolean;
  issues: SemanticIssue[];
}

export function validateSemanticDefinition(definition: unknown): SemanticValidationResult;
