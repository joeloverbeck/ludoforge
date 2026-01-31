import type { GameDefinition } from "../../dsl/types.js";
import type { SkillExpressionMetricOptions } from "../types.js";

export function computeSkillExpressionMetric(
  definition: GameDefinition,
  options?: SkillExpressionMetricOptions
): Promise<number>;
