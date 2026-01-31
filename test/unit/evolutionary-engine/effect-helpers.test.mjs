import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRandomEffect, EFFECT_KINDS, buildRefForKind, buildEffectProps } from "../../../src/evolutionary-engine/mutation/effect-helpers.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("effect-helpers", () => {
  describe("EFFECT_KINDS", () => {
    it("contains all 15 valid effect kinds", () => {
      assert.equal(EFFECT_KINDS.length, 15);
      assert.ok(EFFECT_KINDS.includes("set"));
      assert.ok(EFFECT_KINDS.includes("inc"));
      assert.ok(EFFECT_KINDS.includes("dec"));
      assert.ok(EFFECT_KINDS.includes("move"));
      assert.ok(EFFECT_KINDS.includes("spawn"));
      assert.ok(EFFECT_KINDS.includes("destroy"));
      assert.ok(EFFECT_KINDS.includes("reveal"));
      assert.ok(EFFECT_KINDS.includes("hide"));
      assert.ok(EFFECT_KINDS.includes("move_spatial"));
      assert.ok(EFFECT_KINDS.includes("repeat"));
      assert.ok(EFFECT_KINDS.includes("set_flag"));
      assert.ok(EFFECT_KINDS.includes("conditional"));
      assert.ok(EFFECT_KINDS.includes("shuffle"));
      assert.ok(EFFECT_KINDS.includes("queue_push"));
      assert.ok(EFFECT_KINDS.includes("queue_pop"));
    });
  });

  describe("buildRandomEffect", () => {
    it("produces an effect with kind and target", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = createSeededRng(42);

      const effect = buildRandomEffect(definition, rng);

      assert.ok(EFFECT_KINDS.includes(effect.kind));
      if (effect.kind !== "repeat" && effect.kind !== "conditional") {
        assert.ok(effect.target);
        assert.ok(typeof effect.target.kind === "string");
        assert.ok(typeof effect.target.id === "string");
      }
    });

    it("produces deterministic results with seeded RNG", () => {
      const definition = cloneDefinition(baseDefinition);

      const effect1 = buildRandomEffect(definition, createSeededRng(99));
      const effect2 = buildRandomEffect(definition, createSeededRng(99));

      assert.deepStrictEqual(effect1, effect2);
    });

    it("adds amount for inc/dec kinds", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: (n) => 1 };

      const effect = buildRandomEffect(definition, rng);

      if (effect.kind === "inc" || effect.kind === "dec") {
        assert.equal(typeof effect.amount, "number");
      }
    });

    it("adds value for set kind", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: (n) => 0 };

      const effect = buildRandomEffect(definition, rng);

      if (effect.kind === "set") {
        assert.equal(typeof effect.value, "number");
      }
    });

    it("adds toZone for move/spawn kinds", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: (n) => 3 };

      const effect = buildRandomEffect(definition, rng);

      if (effect.kind === "move" || effect.kind === "spawn") {
        assert.equal(typeof effect.toZone, "string");
      }
    });

    it("builds conditional effects without targets", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = {
        nextInt: (n) => n - 1,
      };

      const effect = buildRandomEffect(definition, rng);

      assert.equal(effect.kind, "conditional");
      assert.equal(effect.target, undefined);
      assert.ok(effect.condition);
      assert.ok(Array.isArray(effect.then));
    });
  });

  describe("buildRefForKind", () => {
    it("returns var ref for inc/dec/set", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("inc", definition, rng);
      assert.equal(ref.kind, "var");
      assert.equal(ref.id, "score");
    });

    it("returns token ref for move/spawn/destroy", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("move", definition, rng);
      assert.equal(ref.kind, "token");
      assert.equal(ref.id, "pawn");
    });

    it("returns zone ref for reveal/hide", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("reveal", definition, rng);
      assert.equal(ref.kind, "zone");
      assert.equal(ref.id, "board");
    });

    it("returns zone ref for shuffle", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("shuffle", definition, rng);
      assert.equal(ref.kind, "zone");
      assert.equal(ref.id, "board");
    });

    it("returns token ref for queue_push", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("queue_push", definition, rng);
      assert.equal(ref.kind, "token");
      assert.equal(ref.id, "pawn");
    });

    it("returns null for queue_pop", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const ref = buildRefForKind("queue_pop", definition, rng);
      assert.equal(ref, null);
    });
  });

  describe("buildEffectProps", () => {
    it("returns amount for inc", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("inc", definition, rng);
      assert.equal(props.amount, 1);
    });

    it("returns value for set", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("set", definition, rng);
      assert.equal(props.value, 0);
    });

    it("returns toZone for move", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("move", definition, rng);
      assert.equal(typeof props.toZone, "string");
    });

    it("returns empty object for destroy", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("destroy", definition, rng);
      assert.deepStrictEqual(props, {});
    });

    it("returns condition and branches for conditional", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("conditional", definition, rng);

      assert.ok(props.condition);
      assert.ok(Array.isArray(props.then));
      assert.equal(props.then.length > 0, true);
    });

    it("returns empty object for shuffle", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("shuffle", definition, rng);
      assert.deepStrictEqual(props, {});
    });

    it("returns toZone for queue_push", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("queue_push", definition, rng);
      assert.equal(typeof props.toZone, "string");
    });

    it("returns fromZone for queue_pop", () => {
      const definition = cloneDefinition(baseDefinition);
      const rng = { nextInt: () => 0 };

      const props = buildEffectProps("queue_pop", definition, rng);
      assert.equal(typeof props.fromZone, "string");
    });
  });
});
