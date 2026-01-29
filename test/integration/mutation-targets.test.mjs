import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectActionEffectTargets,
  collectActionTargets,
  collectTokenTypeTargets,
  collectVariableTargets,
  collectZoneTargets,
} from "../../src/evolutionary-engine/mutation/targets.js";
import {
  genomeActionsDefinition,
  genomeBasicDefinition,
  genomeZonesDefinition,
} from "./fixtures/index.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("mutation-targets", () => {
  describe("collectVariableTargets", () => {
    it("includes variables and token attributes in order", () => {
      const definition = cloneDefinition(genomeBasicDefinition);
      const targets = collectVariableTargets(definition);

      assert.equal(targets.length, 3);
      assert.equal(targets[0].variable.id, "score");
      assert.equal(targets[1].variable.id, "energy");
      assert.equal(targets[2].variable.id, "owner");
      assert.equal(targets[0].index, 0);
      assert.equal(targets[1].index, 1);
      assert.equal(targets[2].index, 0);
      assert.strictEqual(targets[0].container, definition.state.variables);
      assert.strictEqual(targets[2].container, definition.state.tokenTypes[0].attributes);
    });
  });

  describe("collectActionTargets", () => {
    it("returns action entries and handles missing lists", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      const targets = collectActionTargets(definition);

      assert.equal(targets.length, 1);
      assert.equal(targets[0].action.id, "wait");
      assert.equal(targets[0].index, 0);
      assert.strictEqual(targets[0].container, definition.actions);

      assert.deepEqual(collectActionTargets({ state: {} }), []);
    });
  });

  describe("collectActionEffectTargets", () => {
    it("yields costs and effects with indices", () => {
      const definition = {
        actions: [
          {
            id: "act",
            costs: [{ kind: "inc", amount: 1 }],
            effects: [{ kind: "dec", amount: 2 }],
          },
        ],
      };

      const targets = collectActionEffectTargets(definition);
      assert.equal(targets.length, 2);
      assert.equal(targets[0].list, "costs");
      assert.equal(targets[0].actionIndex, 0);
      assert.equal(targets[0].effectIndex, 0);
      assert.equal(targets[1].list, "effects");
      assert.equal(targets[1].effectIndex, 0);
      assert.deepEqual(collectActionEffectTargets({ state: {} }), []);
    });
  });

  describe("collectZoneTargets and collectTokenTypeTargets", () => {
    it("handle empty state", () => {
      const definition = cloneDefinition(genomeZonesDefinition);

      const zones = collectZoneTargets(definition);
      const tokenTypes = collectTokenTypeTargets(definition);
      assert.equal(zones.length, 2);
      assert.equal(tokenTypes.length, 2);
      assert.strictEqual(zones, definition.state.zones);
      assert.strictEqual(tokenTypes, definition.state.tokenTypes);

      assert.deepEqual(collectZoneTargets({}), []);
      assert.deepEqual(collectTokenTypeTargets({}), []);
    });
  });
});
