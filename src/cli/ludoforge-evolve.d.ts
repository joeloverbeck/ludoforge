export interface LudoforgeEvolveResult {
  runId?: string;
  baseDir?: string;
  dryRun?: boolean;
  resumed?: boolean;
  populationSize?: number;
  help?: boolean;
  message?: string;
  result?: unknown;
}

export interface LudoforgeEvolveOptions {
  argv?: string[];
  deps?: Record<string, unknown>;
}

export function runLudoforgeEvolve(
  options?: LudoforgeEvolveOptions,
): Promise<LudoforgeEvolveResult>;
