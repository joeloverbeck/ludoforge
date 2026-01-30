function resolveRandomValue(rng) {
  if (rng && typeof rng.next === "function") {
    return rng.next();
  }
  return Math.random();
}

export function weightedSelect(names, weights, rng) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("names must be a non-empty array");
  }
  if (!Array.isArray(weights)) {
    throw new Error("weights must be an array");
  }
  if (names.length !== weights.length) {
    throw new Error("names and weights must have the same length");
  }

  let total = 0;
  weights.forEach((weight, index) => {
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`weights[${index}] must be a finite number > 0`);
    }
    total += weight;
  });

  if (total <= 0) {
    throw new Error("total weight must be greater than 0");
  }

  const roll = resolveRandomValue(rng) * total;
  let cumulative = 0;

  for (let i = 0; i < weights.length; i += 1) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return names[i];
    }
  }

  return names[names.length - 1];
}
