import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertNonEmptyArray,
  assertPopulation,
  isPlainObject,
  canBuildWeightedSelector,
  ensureTelemetryOperators,
} from "../../src/evolution-runner/runner-validation.js";
import { defaultMutationOperators } from "../../src/evolutionary-engine/mutation.js";
import { DEFAULT_EVOLUTION_OPERATORS_CONFIG } from "../../src/evolutionary-engine/operator-config.js";
import { createTelemetry } from "../../src/evolution-runner/operator-telemetry.js";
import { genomeBasicDefinition } from "./fixtures/index.mjs";

describe("runner-validation integration", () => {
  describe("assertPopulation with real fixture genomes", () => {
    it("accepts a population of valid genomes", () => {
      const population = [
        { id: "genome-1", definition: structuredClone(genomeBasicDefinition) },
        { id: "genome-2", definition: structuredClone(genomeBasicDefinition) },
      ];
      assert.doesNotThrow(() => assertPopulation(population));
    });

    it("rejects a population with missing definition", () => {
      const population = [{ id: "genome-1" }];
      assert.throws(() => assertPopulation(population), /definition object/);
    });

    it("rejects a population with empty id", () => {
      const population = [
        { id: "", definition: structuredClone(genomeBasicDefinition) },
      ];
      assert.throws(() => assertPopulation(population), /non-empty id/);
    });

    it("rejects an empty array", () => {
      assert.throws(() => assertPopulation([]), /non-empty array/);
    });
  });

  describe("assertNonEmptyArray", () => {
    it("accepts a non-empty array", () => {
      assert.doesNotThrow(() => assertNonEmptyArray([1], "test"));
    });

    it("rejects an empty array", () => {
      assert.throws(() => assertNonEmptyArray([], "Values"), /Values/);
    });

    it("rejects a non-array", () => {
      assert.throws(() => assertNonEmptyArray("x", "Values"), /Values/);
    });
  });

  describe("isPlainObject", () => {
    it("returns true for plain objects", () => {
      assert.equal(isPlainObject({}), true);
      assert.equal(isPlainObject({ a: 1 }), true);
    });

    it("returns false for non-objects", () => {
      assert.equal(isPlainObject(null), false);
      assert.equal(isPlainObject([]), false);
      assert.equal(isPlainObject("string"), false);
    });
  });

  describe("canBuildWeightedSelector with real operators", () => {
    it("returns true with defaultMutationOperators and default config weights", () => {
      const weights = DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.weights;
      const result = canBuildWeightedSelector(defaultMutationOperators, weights);
      assert.equal(result, true);
    });

    it("returns false with empty operators array", () => {
      const weights = DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.weights;
      assert.equal(canBuildWeightedSelector([], weights), false);
    });

    it("returns false with null weights", () => {
      assert.equal(canBuildWeightedSelector(defaultMutationOperators, null), false);
    });

    it("returns false with missing weight for an operator", () => {
      const result = canBuildWeightedSelector(defaultMutationOperators, {});
      assert.equal(result, false);
    });
  });

  describe("ensureTelemetryOperators with real createTelemetry", () => {
    it("accepts telemetry created with matching operator names", () => {
      const names = defaultMutationOperators.map((op) => op.name);
      const telemetry = createTelemetry(names);
      assert.doesNotThrow(() => ensureTelemetryOperators(telemetry, names));
    });

    it("throws if telemetry is missing an operator", () => {
      const names = defaultMutationOperators.map((op) => op.name);
      const telemetry = createTelemetry(names);
      assert.throws(
        () => ensureTelemetryOperators(telemetry, [...names, "nonexistent"]),
        /missing operator/,
      );
    });

    it("throws if telemetry is null", () => {
      assert.throws(
        () => ensureTelemetryOperators(null, ["op1"]),
        /missing operator counters/,
      );
    });
  });
});
