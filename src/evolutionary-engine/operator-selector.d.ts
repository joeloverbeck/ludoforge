import type { SeededRng } from "../simulation-engine/types.js";
import type { Genome, MutationOperator } from "./types.js";

export interface OperatorSelector {
  pick(rng?: SeededRng): string;
  observe(telemetry?: {
    operators?: Record<string, { attempts: number; validEvaluated?: number }>;
  }): void;
}

export class WeightedSelector implements OperatorSelector {
  constructor(options: {
    operators: ReadonlyArray<MutationOperator<Genome>>;
    weights: Record<string, number>;
  });

  pick(rng?: SeededRng): string;
  observe(telemetry?: {
    operators?: Record<string, { attempts: number; validEvaluated?: number }>;
  }): void;
}
