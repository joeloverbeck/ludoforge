import { weightedSelect } from "./mutation/weighted-selection.js";

const FAILURE_RATE_PENALIZE = 0.30;
const FAILURE_RATE_RESTORE = 0.10;
const MIN_WEIGHT = 0.1;
const RESTORE_FACTOR = 0.5;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class WeightedSelector {
  constructor({ operators, weights }) {
    if (!Array.isArray(operators) || operators.length === 0) {
      throw new Error("operators must be a non-empty array");
    }
    if (!isPlainObject(weights)) {
      throw new Error("weights must be an object");
    }

    const names = operators.map((operator) => operator?.name).filter(Boolean);
    if (names.length !== operators.length) {
      throw new Error("all operators must have a name");
    }

    const weightList = names.map((name) => weights[name]);
    weightList.forEach((weight, index) => {
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error(`weight for ${names[index]} must be a finite number > 0`);
      }
    });

    this.names = names;
    this.baseWeights = [...weightList];
    this.weights = weightList;
  }

  pick(rng) {
    return weightedSelect(this.names, this.weights, rng);
  }

  observe(telemetry) {
    if (
      telemetry == null ||
      typeof telemetry !== "object" ||
      !isPlainObject(telemetry.operators)
    ) {
      return;
    }

    const ops = telemetry.operators;
    const newWeights = this.weights.map((current, i) => {
      const name = this.names[i];
      const stats = ops[name];
      if (!stats || !Number.isFinite(stats.attempts) || stats.attempts === 0) {
        return current;
      }

      const failureRate =
        (stats.attempts - (stats.validEvaluated ?? 0)) / stats.attempts;

      if (failureRate > FAILURE_RATE_PENALIZE) {
        return Math.max(MIN_WEIGHT, current * RESTORE_FACTOR);
      }

      if (failureRate < FAILURE_RATE_RESTORE) {
        const base = this.baseWeights[i];
        return Math.min(base, current + (base - current) * RESTORE_FACTOR);
      }

      return current;
    });

    this.weights = newWeights;
  }
}
