import { generateGameDefinition } from "../seed-generation/grammar-generator.js";
import { validateGameDefinition } from "../dsl/validate.js";
import { createGenomeId } from "../evolutionary-engine/serialization.js";

export function replenishPopulation(currentPopulation, options) {
  const { minSize, rng, grammarConfig } = options;
  if (!Number.isInteger(minSize) || minSize <= 0) {
    return { population: currentPopulation, injectedCount: 0 };
  }
  if (currentPopulation.length >= minSize) {
    return { population: currentPopulation, injectedCount: 0 };
  }

  const needed = minSize - currentPopulation.length;
  const injected = [];
  const maxAttemptsPerGenome = 20;

  for (let i = 0; i < needed; i += 1) {
    let genome = null;
    for (let attempt = 0; attempt < maxAttemptsPerGenome; attempt += 1) {
      const definition = generateGameDefinition({
        rng,
        grammar: grammarConfig ?? {},
      });
      const validation = validateGameDefinition(definition);
      if (validation.valid) {
        const id = createGenomeId(definition);
        genome = { id, definition };
        break;
      }
    }
    if (genome) {
      injected.push(genome);
    }
  }

  return {
    population: [...currentPopulation, ...injected],
    injectedCount: injected.length,
  };
}
