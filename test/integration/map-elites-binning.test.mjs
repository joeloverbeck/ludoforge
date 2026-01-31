import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assembleFeatureVector } from "../../src/evaluation-analytics/feature-vector.js";
import {
  binDescriptorValue,
  getDescriptorCoordinates,
  getNicheId,
} from "../../src/evolutionary-engine/map-elites.js";
import { generateSeedPopulation } from "../../src/seed-generation/generate-seed-population.js";

const MAP_ELITES_CONFIG = {
  descriptors: [
    { id: "agency", min: 0, max: 1, bins: 3 },
    { id: "variety", min: 0, max: 1, bins: 3 },
  ],
};

describe("map-elites-binning integration", () => {
  describe("NaN metric flows through pipeline to unknown niche", () => {
    it("assembleFeatureVector + descriptor extraction + binning produces :unknown", () => {
      // Step 1: Assemble a feature vector with a NaN metric value
      const metrics = [
        { id: "agency", value: NaN },
        { id: "variety", value: 0.5 },
      ];
      const degeneracy = { flags: [] };
      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, degeneracy);

      // nonFiniteKeys should include "agency"
      assert.ok(
        nonFiniteKeys.includes("agency"),
        `nonFiniteKeys should include "agency", got: ${JSON.stringify(nonFiniteKeys)}`
      );

      // Feature vector normalizes NaN to 0 for fitness stability
      assert.equal(vector.agency, 0, "NaN metric should be normalized to 0 in feature vector");
      assert.equal(vector.variety, 0.5, "finite metric should be preserved");

      // Step 2: Extract descriptors (simulating what createEvaluator does)
      const descriptorKeys = ["agency", "variety"];
      const nonFiniteSet = new Set(nonFiniteKeys);
      const descriptors = Object.fromEntries(
        descriptorKeys.map((k) => [k, nonFiniteSet.has(k) ? null : (vector[k] ?? 0)])
      );

      assert.equal(descriptors.agency, null, "non-finite key should produce null descriptor");
      assert.equal(descriptors.variety, 0.5, "finite key should produce numeric descriptor");

      // Step 3: Bin the descriptors
      const coordinates = getDescriptorCoordinates(descriptors, MAP_ELITES_CONFIG);
      assert.equal(coordinates[0], "unknown", "null descriptor should bin to 'unknown'");
      assert.equal(typeof coordinates[1], "number", "finite descriptor should bin to a number");

      // Step 4: Serialize the niche id
      const nicheId = getNicheId(MAP_ELITES_CONFIG, coordinates);
      assert.ok(
        nicheId.includes("agency:unknown"),
        `niche id should contain 'agency:unknown', got: ${nicheId}`
      );
      assert.ok(
        !nicheId.includes("agency:0"),
        "niche id should NOT conflate unknown with bin 0"
      );
    });
  });

  describe("seed-generation nicheId matches MAP-Elites placement nicheId", () => {
    it("same descriptor values produce identical nicheId in both paths", async () => {
      // Fixed descriptor values for a deterministic test
      const fixedDescriptors = { agency: 0.3, variety: 0.7 };
      let callCount = 0;

      const result = await generateSeedPopulation({
        populationSize: 1,
        maxAttempts: 10,
        rngSeed: 42,
        evaluator: () => {
          callCount++;
          return {
            fitness: 1.0,
            descriptors: fixedDescriptors,
          };
        },
        mapElitesConfig: MAP_ELITES_CONFIG,
        coverageStrategy: "random",
      });

      assert.ok(callCount >= 1, "evaluator should have been called");
      assert.equal(result.genomes.length, 1);

      // Compute nicheId the same way MAP-Elites placement would
      const coordinates = getDescriptorCoordinates(fixedDescriptors, MAP_ELITES_CONFIG);
      const expectedNicheId = getNicheId(MAP_ELITES_CONFIG, coordinates);

      // Seed generation uses the same binning functions, so the nicheId
      // recorded in binCounts should match
      const reportBinKeys = Object.keys(result.report.binCounts);
      assert.equal(reportBinKeys.length, 1, "should have exactly 1 bin count entry");
      assert.equal(
        reportBinKeys[0],
        expectedNicheId,
        `seed-generation niche id should match MAP-Elites niche id: expected "${expectedNicheId}", got "${reportBinKeys[0]}"`
      );
    });
  });
});
