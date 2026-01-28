export function tweakIntValue(value, min, max, rng) {
  if (typeof value !== "number" || typeof min !== "number" || typeof max !== "number") {
    return value;
  }
  if (min > max) {
    return value;
  }
  if (min === max) {
    return min;
  }

  let direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  if (value <= min) {
    direction = 1;
  } else if (value >= max) {
    direction = -1;
  }

  const nextValue = value + direction;
  if (nextValue < min) {
    return min;
  }
  if (nextValue > max) {
    return max;
  }
  return nextValue;
}

export function tweakNonNegative(value, rng) {
  let nextValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  let direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  if (nextValue <= 0) {
    direction = 1;
  }
  nextValue += direction;
  if (nextValue < 0) {
    return 0;
  }
  return nextValue;
}
