import { weightedSelect } from "./mutation/weighted-selection.js";

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
    this.weights = weightList;
  }

  pick(rng) {
    return weightedSelect(this.names, this.weights, rng);
  }

  observe() {}
}
