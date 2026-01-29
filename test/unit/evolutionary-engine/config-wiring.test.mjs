import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_MAP_ELITES_CONFIG } from "../../../src/evolutionary-engine/map-elites.js";
import { defaultMutationOperators } from "../../../src/evolutionary-engine/mutation.js";
import { defaultCrossoverOperators } from "../../../src/evolutionary-engine/crossover.js";
import { defaultRepairOperators } from "../../../src/evolutionary-engine/repair.js";
import { DEFAULT_EVOLUTION_OPERATORS_CONFIG } from "../../../src/evolutionary-engine/operator-config.js";

describe("config-wiring", () => {
  describe("DEFAULT_MAP_ELITES_CONFIG", () => {
    it("is a valid object with expected properties", () => {
      assert.ok(DEFAULT_MAP_ELITES_CONFIG);
      assert.ok(typeof DEFAULT_MAP_ELITES_CONFIG === "object");
      assert.ok(Array.isArray(DEFAULT_MAP_ELITES_CONFIG.descriptors));
      assert.ok(DEFAULT_MAP_ELITES_CONFIG.descriptors.length > 0);
      assert.ok("fitnessKey" in DEFAULT_MAP_ELITES_CONFIG);
      assert.ok("tieBreak" in DEFAULT_MAP_ELITES_CONFIG);
    });

    it("descriptors have valid binning fields", () => {
      for (const descriptor of DEFAULT_MAP_ELITES_CONFIG.descriptors) {
        assert.ok(typeof descriptor.id === "string");
        assert.ok(typeof descriptor.min === "number");
        assert.ok(typeof descriptor.max === "number");
        assert.ok(Number.isInteger(descriptor.bins));
        assert.ok(descriptor.bins > 0);
        assert.ok(descriptor.max > descriptor.min);
      }
    });
  });

  describe("defaultMutationOperators", () => {
    it("has 14 entries matching config mutation.enabled", () => {
      const enabledNames = DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.enabled;
      assert.ok(Array.isArray(enabledNames));
      assert.equal(defaultMutationOperators.length, enabledNames.length);

      const operatorNames = defaultMutationOperators.map((op) => op.name);
      for (const name of enabledNames) {
        assert.ok(operatorNames.includes(name), `Missing mutation operator: ${name}`);
      }
    });
  });

  describe("defaultCrossoverOperators", () => {
    it("contains subtree-swap from config", () => {
      const enabledNames = DEFAULT_EVOLUTION_OPERATORS_CONFIG.crossover?.enabled;
      assert.ok(Array.isArray(enabledNames));
      assert.equal(defaultCrossoverOperators.length, enabledNames.length);

      const operatorNames = defaultCrossoverOperators.map((op) => op.name);
      assert.ok(operatorNames.includes("subtree-swap"));
    });
  });

  describe("defaultRepairOperators", () => {
    it("contains dsl-safety from config", () => {
      const enabledNames = DEFAULT_EVOLUTION_OPERATORS_CONFIG.repair?.enabled;
      assert.ok(Array.isArray(enabledNames));
      assert.equal(defaultRepairOperators.length, enabledNames.length);

      const operatorNames = defaultRepairOperators.map((op) => op.name);
      assert.ok(operatorNames.includes("dsl-safety"));
    });
  });
});
