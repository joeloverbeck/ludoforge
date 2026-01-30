export function getRandomIndex(length, rng) {
  if (length <= 0) {
    return -1;
  }
  if (rng) {
    return rng.nextInt(length);
  }
  return Math.floor(Math.random() * length);
}

export function pickDifferentValue(values, current, rng) {
  const candidates = values.filter((value) => value !== current);
  if (candidates.length === 0) {
    return current;
  }
  const index = getRandomIndex(candidates.length, rng);
  return candidates[Math.max(0, index)];
}

