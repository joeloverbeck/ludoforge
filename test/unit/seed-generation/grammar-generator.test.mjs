import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { generateGameDefinition } from "../../../src/seed-generation/grammar-generator.js";
import { validateGameDefinition } from "../../../src/dsl/validate.js";
import { validateSemanticDefinition } from "../../../src/dsl/semantic.js";
import {
  defaultGrammar,
  minimalGrammar,
  decOnlyGrammar,
  maxGrammar,
  makeRng,
} from "./fixtures.mjs";

describe("generateGameDefinition", () => {
  it("returns object with all required top-level keys", () => {
    const def = generateGameDefinition({ rng: makeRng(1), grammar: defaultGrammar });
    const requiredKeys = ["version", "players", "state", "actions", "turn", "termination"];
    for (const key of requiredKeys) {
      assert.ok(key in def, `missing key: ${key}`);
    }
  });

  it("passes validateGameDefinition for 100 seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const result = validateGameDefinition(def);
      assert.ok(
        result.valid,
        `seed ${seed} schema invalid: ${JSON.stringify(result.errors)}`
      );
    }
  });

  it("passes validateSemanticDefinition for 100 seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const result = validateSemanticDefinition(def);
      assert.ok(
        result.valid,
        `seed ${seed} semantic invalid: ${JSON.stringify(result.issues)}`
      );
    }
  });

  it("players.count >= 1", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      assert.ok(def.players.count >= 1, `seed ${seed}: count=${def.players.count}`);
    }
  });

  it(">= 1 action with >= 1 effect", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      assert.ok(def.actions.length >= 1, `seed ${seed}: no actions`);
      for (const action of def.actions) {
        assert.ok(action.effects.length >= 1, `seed ${seed}: action ${action.id} has no effects`);
      }
    }
  });

  it(">= 1 termination condition and maxTurns exists", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      assert.ok(def.termination.conditions.length >= 1, `seed ${seed}: no termination conditions`);
      assert.equal(typeof def.termination.maxTurns, "number");
    }
  });

  it("no dangling variable refs", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const varIds = new Set(def.state.variables.map((v) => v.id));

      function collectVarRefs(node) {
        const refs = [];
        if (!node || typeof node !== "object") return refs;
        if (node.kind === "var" && typeof node.id === "string") {
          refs.push(node.id);
        }
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              refs.push(...collectVarRefs(item));
            }
          } else if (value && typeof value === "object") {
            refs.push(...collectVarRefs(value));
          }
        }
        return refs;
      }

      const allRefs = collectVarRefs(def);
      for (const ref of allRefs) {
        assert.ok(varIds.has(ref), `seed ${seed}: dangling ref "${ref}"`);
      }
    }
  });

  it("limits controls variable and action counts", () => {
    const grammar = {
      limits: { minVariables: 3, maxVariables: 3, minActions: 2, maxActions: 2 },
      weights: { inc: 1 },
    };
    for (let seed = 0; seed < 20; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar });
      assert.equal(def.state.variables.length, 3, `seed ${seed}: vars`);
      assert.equal(def.actions.length, 2, `seed ${seed}: actions`);
    }
  });

  it("weights: { inc: 1 } produces only inc effects", () => {
    const grammar = {
      limits: { minVariables: 3, maxVariables: 3, minActions: 2, maxActions: 2 },
      weights: { inc: 1 },
    };
    for (let seed = 0; seed < 20; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar });
      for (const action of def.actions) {
        for (const effect of action.effects) {
          assert.equal(effect.kind, "inc", `seed ${seed}: expected inc, got ${effect.kind}`);
        }
      }
    }
  });

  it("weights: { dec: 1 } produces only dec effects", () => {
    for (let seed = 0; seed < 20; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: decOnlyGrammar });
      for (const action of def.actions) {
        for (const effect of action.effects) {
          assert.equal(effect.kind, "dec", `seed ${seed}: expected dec, got ${effect.kind}`);
        }
      }
    }
  });

  it("same seed + grammar = identical output (determinism)", () => {
    for (let seed = 0; seed < 10; seed++) {
      const a = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const b = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      assert.deepStrictEqual(a, b, `seed ${seed}: non-deterministic`);
    }
  });

  it("no node:fs import in source files", () => {
    const primitives = readFileSync(
      new URL("../../../src/seed-generation/primitives.js", import.meta.url),
      "utf8"
    );
    const generator = readFileSync(
      new URL("../../../src/seed-generation/grammar-generator.js", import.meta.url),
      "utf8"
    );
    assert.ok(!primitives.includes("node:fs"), "primitives.js imports node:fs");
    assert.ok(!generator.includes("node:fs"), "grammar-generator.js imports node:fs");
  });

  it("default grammar used when limits/weights omitted", () => {
    const def = generateGameDefinition({ rng: makeRng(42), grammar: {} });
    assert.ok(def.state.variables.length >= 1 && def.state.variables.length <= 5);
    assert.ok(def.actions.length >= 1 && def.actions.length <= 5);

    const defNoGrammar = generateGameDefinition({ rng: makeRng(42) });
    assert.ok(defNoGrammar.state.variables.length >= 1 && defNoGrammar.state.variables.length <= 5);
  });

  it("passes schema and semantic validation with maxGrammar", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: maxGrammar });
      const schema = validateGameDefinition(def);
      assert.ok(schema.valid, `seed ${seed} schema: ${JSON.stringify(schema.errors)}`);
      const semantic = validateSemanticDefinition(def);
      assert.ok(semantic.valid, `seed ${seed} semantic: ${JSON.stringify(semantic.issues)}`);
    }
  });
});
