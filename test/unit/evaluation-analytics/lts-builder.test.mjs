import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLts, canonicalLabel } from "../../../src/evaluation-analytics/lts-builder.js";

describe("canonicalLabel", () => {
  it("returns 'pass' for empty effects array", () => {
    assert.equal(canonicalLabel([]), "pass");
  });

  it("produces deterministic label regardless of effect order", () => {
    const effectA = { kind: "inc", target: { kind: "var", id: "hp", scope: "per_player" }, amount: 5, source: "effect" };
    const effectB = { kind: "dec", target: { kind: "var", id: "gold", scope: "global" }, amount: 3, source: "cost" };

    const label1 = canonicalLabel([effectA, effectB]);
    const label2 = canonicalLabel([effectB, effectA]);
    assert.equal(label1, label2);
  });

  it("includes amount for inc/dec effects", () => {
    const effect = { kind: "inc", target: { kind: "var", id: "score", scope: "per_player" }, amount: 10, source: "effect" };
    const label = canonicalLabel([effect]);
    assert.ok(label.includes("amt=10"));
  });

  it("includes value for set effects", () => {
    const effect = { kind: "set", target: { kind: "var", id: "active", scope: "global" }, value: true, source: "effect" };
    const label = canonicalLabel([effect]);
    assert.ok(label.includes("val=true"));
  });
});

describe("buildLts", () => {
  it("returns empty nodes and edges for empty input", () => {
    const result = buildLts([]);
    assert.deepEqual(result, { nodes: [], edges: [] });
  });

  it("returns empty nodes and edges for empty trajectory", () => {
    const result = buildLts([[]]);
    assert.deepEqual(result, { nodes: [], edges: [] });
  });

  it("merges nodes from overlapping stateHashes across trajectories", () => {
    const traj1 = [
      { stateHash: "A", appliedEffects: [], bindings: {} },
      { stateHash: "B", appliedEffects: [{ kind: "inc", target: { kind: "var", id: "x", scope: "global" }, amount: 1, source: "effect" }], bindings: {} },
    ];
    const traj2 = [
      { stateHash: "A", appliedEffects: [], bindings: {} },
      { stateHash: "C", appliedEffects: [{ kind: "dec", target: { kind: "var", id: "y", scope: "global" }, amount: 2, source: "effect" }], bindings: {} },
    ];

    const result = buildLts([traj1, traj2]);
    assert.deepEqual(result.nodes, ["A", "B", "C"]);
  });

  it("produces self-loop edges for pass steps (empty appliedEffects)", () => {
    const traj = [
      { stateHash: "S1", appliedEffects: [], bindings: {} },
    ];
    const result = buildLts([traj]);

    assert.equal(result.nodes.length, 1);
    assert.equal(result.edges.length, 1);
    assert.deepEqual(result.edges[0], { from: "S1", to: "S1", label: "pass" });
  });

  it("produces deterministic output for same input", () => {
    const traj = [
      { stateHash: "X", appliedEffects: [], bindings: {} },
      { stateHash: "Y", appliedEffects: [{ kind: "inc", target: { kind: "var", id: "a", scope: "global" }, amount: 1, source: "effect" }], bindings: {} },
    ];

    const result1 = buildLts([traj]);
    const result2 = buildLts([traj]);
    assert.deepEqual(result1, result2);
  });

  it("deduplicates edges by (from, to, label)", () => {
    const effects = [{ kind: "inc", target: { kind: "var", id: "a", scope: "global" }, amount: 1, source: "effect" }];
    const traj1 = [
      { stateHash: "A", appliedEffects: [], bindings: {} },
      { stateHash: "B", appliedEffects: effects, bindings: {} },
    ];
    const traj2 = [
      { stateHash: "A", appliedEffects: [], bindings: {} },
      { stateHash: "B", appliedEffects: effects, bindings: {} },
    ];

    const result = buildLts([traj1, traj2]);
    const abEdges = result.edges.filter((e) => e.from === "A" && e.to === "B");
    assert.equal(abEdges.length, 1);
  });

  it("single-step trajectory with effects produces node only, no non-self-loop edge", () => {
    const effects = [{ kind: "inc", target: { kind: "var", id: "z", scope: "global" }, amount: 1, source: "effect" }];
    const traj = [{ stateHash: "Q", appliedEffects: effects, bindings: {} }];

    const result = buildLts([traj]);
    assert.deepEqual(result.nodes, ["Q"]);
    assert.deepEqual(result.edges, []);
  });

  it("single-step pass trajectory produces node and self-loop", () => {
    const traj = [{ stateHash: "P", appliedEffects: [], bindings: {} }];
    const result = buildLts([traj]);

    assert.deepEqual(result.nodes, ["P"]);
    assert.equal(result.edges.length, 1);
    assert.deepEqual(result.edges[0], { from: "P", to: "P", label: "pass" });
  });

  it("multi-step trajectory produces correct edges", () => {
    const eff1 = [{ kind: "inc", target: { kind: "var", id: "hp", scope: "per_player" }, amount: 2, source: "effect" }];
    const eff2 = [{ kind: "set", target: { kind: "var", id: "done", scope: "global" }, value: true, source: "effect" }];

    const traj = [
      { stateHash: "S0", appliedEffects: [], bindings: {} },
      { stateHash: "S1", appliedEffects: eff1, bindings: {} },
      { stateHash: "S2", appliedEffects: eff2, bindings: {} },
    ];

    const result = buildLts([traj]);
    assert.deepEqual(result.nodes, ["S0", "S1", "S2"]);

    // S0 has empty effects → self-loop
    assert.ok(result.edges.some((e) => e.from === "S0" && e.to === "S0" && e.label === "pass"));
    // S0 → S1 with eff1
    assert.ok(result.edges.some((e) => e.from === "S0" && e.to === "S1"));
    // S1 → S2 with eff2
    assert.ok(result.edges.some((e) => e.from === "S1" && e.to === "S2"));
  });

  it("does not mutate input trajectories", () => {
    const traj = [
      { stateHash: "A", appliedEffects: [], bindings: {} },
      { stateHash: "B", appliedEffects: [{ kind: "inc", target: { kind: "var", id: "x", scope: "global" }, amount: 1, source: "effect" }], bindings: {} },
    ];
    const original = JSON.parse(JSON.stringify([traj]));

    buildLts([traj]);
    assert.deepEqual([traj], original);
  });

  it("skips steps without stateHash defensively", () => {
    const traj = [
      { appliedEffects: [], bindings: {} },
      { stateHash: "A", appliedEffects: [], bindings: {} },
    ];
    const result = buildLts([traj]);
    assert.deepEqual(result.nodes, ["A"]);
  });
});
