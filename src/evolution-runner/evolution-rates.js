export function resolveRate(value, label) {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
  return value;
}

export function shouldApply(rate, rng) {
  if (rate <= 0) {
    return false;
  }
  if (rate >= 1) {
    return true;
  }
  const roll = rng ? rng.next() : Math.random();
  return roll < rate;
}
