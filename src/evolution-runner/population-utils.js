export function cloneGenome(genome) {
  return structuredClone(genome);
}

export function clonePopulation(population) {
  return population.map((genome) => cloneGenome(genome));
}

export function selectMateIndex(length, currentIndex, rng) {
  if (length <= 1) {
    return -1;
  }
  const index = rng ? rng.nextInt(length) : Math.floor(Math.random() * length);
  if (index === currentIndex) {
    return (index + 1) % length;
  }
  return index;
}
