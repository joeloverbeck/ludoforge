export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  schemaPath: string;
  params: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateConfig(input: unknown, schemaUrl: string | URL): Promise<ValidationResult>;
