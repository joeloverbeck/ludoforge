import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildEffectMap,
  toDslEffect,
  convertMotifsToEffects,
} from "../../../src/evaluation-analytics/motif-effect-converter.js";
import { canonicalLabel } from "../../../src/evaluation-analytics/lts-builder.js";

describe("motif-effect-converter", () => {
  describe("buildEffectMap", () => {
    it("maps canonical labels to applied effects", () => {
      const effects = [
        { kind: "inc", target: { kind: "var", scope: "global", id: "hp" }, source: "action-1", amount: 1 },
      ];
      const steps = [
        { stateHash: "s0", appliedEffects: effects },
      ];
      const map = buildEffectMap([steps]);
      const label = canonicalLabel(effects);
      assert.ok(map.has(label));
      assert.deepEqual(map.get(label), effects);
    });

    it("uses first-seen effects for duplicate labels", () => {
      const effects1 = [
        { kind: "inc", target: { kind: "var", scope: "global", id: "hp" }, source: "action-1", amount: 1 },
      ];
      // Same source so canonical labels match
      const effects2 = [
        { kind: "inc", target: { kind: "var", scope: "global", id: "hp" }, source: "action-1", amount: 1 },
      ];
      const label = canonicalLabel(effects1);
      assert.equal(canonicalLabel(effects2), label, "labels should match");

      const steps = [
        { stateHash: "s0", appliedEffects: effects1 },
        { stateHash: "s1", appliedEffects: effects2 },
      ];
      const map = buildEffectMap([steps]);
      assert.deepEqual(map.get(label), effects1);
    });

    it("handles empty trajectories", () => {
      const map = buildEffectMap([]);
      assert.equal(map.size, 0);
    });

    it("skips steps without appliedEffects", () => {
      const steps = [
        { stateHash: "s0" },
        { stateHash: "s1", appliedEffects: [] },
      ];
      const map = buildEffectMap([steps]);
      assert.equal(map.size, 0);
    });
  });

  describe("toDslEffect", () => {
    it("strips runtime fields from inc effect", () => {
      const applied = {
        kind: "inc",
        target: { kind: "var", scope: "global", id: "hp" },
        source: "action-1",
        amount: 3,
        clamped: false,
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "inc",
        target: { kind: "var", id: "hp" },
        amount: 3,
      });
    });

    it("strips runtime fields from dec effect", () => {
      const applied = {
        kind: "dec",
        target: { kind: "var", scope: "player", id: "gold" },
        source: "buy",
        amount: 5,
        tokenId: "tok-1",
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "dec",
        target: { kind: "var", id: "gold" },
        amount: 5,
      });
    });

    it("preserves set effect value", () => {
      const applied = {
        kind: "set",
        target: { kind: "var", id: "flag" },
        value: true,
        source: "toggle",
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "set",
        target: { kind: "var", id: "flag" },
        value: true,
      });
    });

    it("preserves move effect toZone", () => {
      const applied = {
        kind: "move",
        target: { kind: "token", id: "pawn", scope: "player" },
        toZone: "discard",
        source: "discard-action",
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "move",
        target: { kind: "token", id: "pawn" },
        toZone: "discard",
      });
    });

    it("handles spawn effect", () => {
      const applied = {
        kind: "spawn",
        target: { kind: "zone", id: "board" },
        tokenType: "warrior",
        count: 2,
        source: "recruit",
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "spawn",
        target: { kind: "zone", id: "board" },
        tokenType: "warrior",
        count: 2,
      });
    });

    it("handles destroy effect", () => {
      const applied = {
        kind: "destroy",
        target: { kind: "token", id: "enemy", scope: "global" },
        source: "attack",
      };
      const dsl = toDslEffect(applied);
      assert.deepEqual(dsl, {
        kind: "destroy",
        target: { kind: "token", id: "enemy" },
      });
    });
  });

  describe("convertMotifsToEffects", () => {
    it("converts motifs to DSL effect sequences end-to-end", () => {
      const effects1 = [
        { kind: "inc", target: { kind: "var", scope: "global", id: "hp" }, source: "s1", amount: 1 },
      ];
      const effects2 = [
        { kind: "dec", target: { kind: "var", scope: "global", id: "hp" }, source: "s2", amount: 2 },
      ];
      const label1 = canonicalLabel(effects1);
      const label2 = canonicalLabel(effects2);

      const effectMap = new Map();
      effectMap.set(label1, effects1);
      effectMap.set(label2, effects2);

      const motifs = [
        {
          signature: `${label1} → ${label2}`,
          ngramSize: 2,
          support: 3,
          exampleOccurrences: [{ fromNode: "n0", path: [label1, label2] }],
        },
      ];

      const sequences = convertMotifsToEffects(motifs, effectMap);
      assert.equal(sequences.length, 1);
      assert.equal(sequences[0].length, 2);
      assert.equal(sequences[0][0].kind, "inc");
      assert.equal(sequences[0][1].kind, "dec");
      // Should be DSL-clean (no source)
      assert.equal(sequences[0][0].source, undefined);
    });

    it("skips motifs with missing labels in effectMap", () => {
      const effectMap = new Map();
      const motifs = [
        {
          signature: "missing",
          ngramSize: 1,
          support: 2,
          exampleOccurrences: [{ fromNode: "n0", path: ["nonexistent-label"] }],
        },
      ];

      const sequences = convertMotifsToEffects(motifs, effectMap);
      assert.equal(sequences.length, 0);
    });

    it("returns empty for empty input", () => {
      const sequences = convertMotifsToEffects([], new Map());
      assert.deepEqual(sequences, []);
    });

    it("does not mutate the effectMap", () => {
      const effects = [
        { kind: "inc", target: { kind: "var", scope: "global", id: "x" }, source: "a", amount: 1 },
      ];
      const label = canonicalLabel(effects);
      const effectMap = new Map();
      effectMap.set(label, effects);
      const originalEffects = structuredClone(effects);

      const motifs = [
        {
          signature: label,
          ngramSize: 1,
          support: 2,
          exampleOccurrences: [{ fromNode: "n0", path: [label] }],
        },
      ];

      convertMotifsToEffects(motifs, effectMap);
      assert.deepEqual(effectMap.get(label), originalEffects);
    });
  });
});
