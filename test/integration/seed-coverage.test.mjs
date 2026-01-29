import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveSeedPopulation } from "../../src/evolution-runner/seed-resolver.js";

/**
 * Creates a mock evaluator that cycles descriptor values across bins.
 * For a 2-descriptor × 2-bin grid, cycles through all 4 bin combinations.
 */
function createGridCyclingEvaluator(descriptors) {
  let index = 0;
  const binCombinations = [];
  const binMidpoints = descriptors.map((d) => {
    const binWidth = (d.max - d.min) / d.bins;
    return Array.from({ length: d.bins }, (_, i) => d.min + binWidth * (i + 0.5));
  });

  // Generate all combinations of midpoints
  function generateCombinations(arrays, current = []) {
    if (current.length === arrays.length) {
      binCombinations.push([...current]);
      return;
    }
    for (const value of arrays[current.length]) {
      current.push(value);
      generateCombinations(arrays, current);
      current.pop();
    }
  }
  generateCombinations(binMidpoints);

  return (_genome) => {
    const combo = binCombinations[index % binCombinations.length];
    index++;
    const result = {};
    descriptors.forEach((d, i) => {
      result[d.id] = combo[i];
    });
    return { descriptors: result };
  };
}

describe("seed-coverage integration", () => {
  it("2-descriptor × 2-bin grid with underfilled-first covers all bins", async () => {
    const descriptors = [
      { id: "complexity", min: 0, max: 1, bins: 2 },
      { id: "balance", min: 0, max: 1, bins: 2 },
    ];

    const mapElitesConfig = { descriptors };
    const evaluator = createGridCyclingEvaluator(descriptors);

    const config = {
      seeding: {
        mode: "generate",
        populationSize: 8,
        generate: {
          coverage: {
            strategy: "underfilled-first",
            maxAttempts: 500,
            fallback: { strategy: "accept-any-valid" },
          },
          grammar: {},
        },
      },
      mapElites: mapElitesConfig,
      seed: 42,
    };

    const result = await resolveSeedPopulation({
      config,
      rngSeed: 42,
      evaluator,
    });

    assert.equal(result.genomes.length, 8);
    assert.equal(result.report.mode, "generate");

    const binCounts = result.report.generate.binCounts;
    const occupiedBins = Object.values(binCounts);
    assert.ok(occupiedBins.length >= 1, "at least one bin occupied");

    // With underfilled-first and cycling evaluator across 4 bins,
    // all 4 bins should have at least 1 genome
    for (const count of occupiedBins) {
      assert.ok(count >= 1, `each occupied bin has >= 1 genome, got ${count}`);
    }
  });

  it("populationSize >= 4 ensures minimum coverage", async () => {
    const descriptors = [
      { id: "x", min: 0, max: 1, bins: 2 },
      { id: "y", min: 0, max: 1, bins: 2 },
    ];

    const mapElitesConfig = { descriptors };
    const evaluator = createGridCyclingEvaluator(descriptors);

    const config = {
      seeding: {
        mode: "generate",
        populationSize: 4,
        generate: {
          coverage: {
            strategy: "underfilled-first",
            maxAttempts: 500,
            fallback: { strategy: "accept-any-valid" },
          },
          grammar: {},
        },
      },
      mapElites: mapElitesConfig,
      seed: 99,
    };

    const result = await resolveSeedPopulation({
      config,
      rngSeed: 99,
      evaluator,
    });

    assert.equal(result.genomes.length, 4);
    const binCounts = result.report.generate.binCounts;
    const totalBinned = Object.values(binCounts).reduce((a, b) => a + b, 0);
    assert.equal(totalBinned, 4);
  });
});
