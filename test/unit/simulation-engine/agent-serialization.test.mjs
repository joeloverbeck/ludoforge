import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeAgents } from "../../../src/simulation-engine/agent-serialization.js";

describe("normalizeAgents", () => {
  it("materializes {kind: 'random'} into agent with selectAction", () => {
    const result = normalizeAgents([{ kind: "random" }]);
    assert.equal(result.length, 1);
    assert.equal(typeof result[0].selectAction, "function");
  });

  it("passes through agent already having selectAction", () => {
    const agent = { selectAction() { return { actionId: "x", args: {} }; } };
    const result = normalizeAgents([agent]);
    assert.equal(result.length, 1);
    assert.equal(result[0], agent);
  });

  it("throws on {} (no kind, no selectAction)", () => {
    assert.throws(
      () => normalizeAgents([{}]),
      /Invalid agent at index 0/,
    );
  });

  it("throws on null", () => {
    assert.throws(
      () => normalizeAgents([null]),
      /Invalid agent at index 0/,
    );
  });

  it("returns [] for empty input", () => {
    const result = normalizeAgents([]);
    assert.deepEqual(result, []);
  });

  it("returns [] for undefined input", () => {
    const result = normalizeAgents();
    assert.deepEqual(result, []);
  });

  it("preserves id on materialized agents", () => {
    const result = normalizeAgents([{ kind: "random", id: "p1" }]);
    assert.equal(result[0].id, "p1");
    assert.equal(typeof result[0].selectAction, "function");
  });

  it("preserves role on materialized agents", () => {
    const result = normalizeAgents([{ kind: "random", role: "attacker" }]);
    assert.equal(result[0].role, "attacker");
    assert.equal(typeof result[0].selectAction, "function");
  });
});
