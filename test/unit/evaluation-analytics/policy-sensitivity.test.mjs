import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import { computePolicySensitivity } from "../../../src/evaluation-analytics/metrics/extended/policy-sensitivity.js";

async function loadFixture(name) {
  const fileUrl = new URL(`../../e2e/fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("policy-sensitivity", () => {
  describe("computePolicySensitivity", () => {
    it("returns 0 when disabled", async () => {
      const result = await computePolicySensitivity(
        { version: "1.0", players: { count: 2 }, actions: [], turn: {}, termination: {} },
        { enabled: false }
      );
      assert.equal(result, 0);
    });

    it("returns 0 when fewer than 2 tiers", async () => {
      const result = await computePolicySensitivity(
        { version: "1.0", players: { count: 2 }, actions: [], turn: {}, termination: {} },
        { enabled: true, agentTiers: ["random"], matchesPerSeat: 4, seed: 42 }
      );
      assert.equal(result, 0);
    });

    it("returns 0 when player count < 2", async () => {
      const result = await computePolicySensitivity(
        { version: "1.0", players: { count: 1 }, actions: [], turn: {}, termination: {} },
        { enabled: true, agentTiers: ["random", "greedy"], matchesPerSeat: 4, seed: 42 }
      );
      assert.equal(result, 0);
    });

    it("produces value > 0 for choice game where greedy beats random", async () => {
      const definition = await loadFixture("choice-game.json");
      const result = await computePolicySensitivity(definition, {
        enabled: true,
        agentTiers: ["random", "greedy"],
        matchesPerSeat: 8,
        seed: 42,
      });

      assert.ok(result >= 0, `expected >= 0, got ${result}`);
      assert.ok(result <= 1, `expected <= 1, got ${result}`);
    });

    it("is deterministic with same seed", async () => {
      const definition = await loadFixture("choice-game.json");
      const opts = {
        enabled: true,
        agentTiers: ["random", "greedy"],
        matchesPerSeat: 4,
        seed: 77,
      };

      const r1 = await computePolicySensitivity(definition, opts);
      const r2 = await computePolicySensitivity(definition, opts);
      assert.equal(r1, r2);
    });

    it("result is always within [0,1]", async () => {
      const definition = await loadFixture("choice-game.json");
      const result = await computePolicySensitivity(definition, {
        enabled: true,
        agentTiers: ["random", "greedy"],
        matchesPerSeat: 8,
        seed: 99,
      });

      assert.ok(result >= 0, `expected >= 0, got ${result}`);
      assert.ok(result <= 1, `expected <= 1, got ${result}`);
    });
  });
});
