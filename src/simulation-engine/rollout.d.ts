import type { RolloutConfig, RolloutResult } from "./types.js";

export function runRollout(config: RolloutConfig): Promise<RolloutResult>;
