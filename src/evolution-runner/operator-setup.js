import { readFile } from "node:fs/promises";
import { DEFAULT_EVOLUTION_OPERATORS_CONFIG } from "../evolutionary-engine/operator-config.js";
import { WeightedSelector } from "../evolutionary-engine/operator-selector.js";
import { resolveRunDir, resolveRunPath } from "./run-layout.js";
import { canBuildWeightedSelector, ensureTelemetryOperators } from "./runner-validation.js";

export function createMutationSelector(operators) {
  const weights = DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.weights;
  if (!canBuildWeightedSelector(operators, weights)) {
    throw new Error(
      "Cannot build mutation selector: missing or invalid operator weights in evolution-operators.json",
    );
  }
  return new WeightedSelector({ operators, weights });
}

export async function loadOperatorStats({ baseDir, runId, startGeneration, operatorNames }) {
  if (!Number.isInteger(startGeneration) || startGeneration <= 0) {
    return null;
  }

  const generation = startGeneration - 1;
  const runDir = resolveRunDir(baseDir, runId);
  const statsPath = resolveRunPath(runDir, `generation-${generation}`, "operator-stats.json");

  let contents;
  try {
    contents = await readFile(statsPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Invalid operator stats at ${statsPath}: ${message}`);
  }

  ensureTelemetryOperators(parsed, operatorNames);
  return parsed;
}
