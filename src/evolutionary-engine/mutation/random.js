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

export function createUniqueId(existing, baseId) {
  const safeBase = typeof baseId === "string" && baseId.length > 0 ? baseId : "action";
  let candidate = `${safeBase}-variant`;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${safeBase}-variant-${counter}`;
    counter += 1;
  }
  return candidate;
}
