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

export interface RunnerLoopConfig {
  generations: number;
  shortlistSize?: number;
  saveEvery?: number;
}

export interface MapElitesDescriptorConfig {
  id: string;
  min: number;
  max: number;
  bins: number;
}

export interface MapElitesConfig {
  descriptors: MapElitesDescriptorConfig[];
  fitnessKey?: string;
  tieBreak?: "keep" | "replace";
}

export interface EvolutionRunnerConfig {
  version: string;
  seed?: number;
  runner: RunnerLoopConfig;
  evaluation?: Record<string, unknown>;
  evolution?: Record<string, unknown>;
  mapElites: MapElitesConfig;
  humanFeedback?: Record<string, unknown>;
}

export function validateRunnerConfig(input: unknown): ValidationResult;
