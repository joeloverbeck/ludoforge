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

  it("dec-only games have preconditions on every action", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: decOnlyGrammar });
      for (const action of def.actions) {
        assert.ok(
          action.preconditions !== undefined,
          `seed ${seed}: action ${action.id} missing preconditions despite dec effects`
        );
      }
    }
  });

  it("dec precondition checks var > min", () => {
    const grammar = {
      limits: { minVariables: 1, maxVariables: 1, minActions: 1, maxActions: 1 },
      weights: { dec: 1 },
    };
    const def = generateGameDefinition({ rng: makeRng(0), grammar });
    const action = def.actions[0];
    assert.ok(action.preconditions, "action should have preconditions");
    assert.equal(action.preconditions.kind, "cmp");
    assert.equal(action.preconditions.op, ">");
    // right side should be value(min), which is 0 for generated int variables
    assert.deepStrictEqual(action.preconditions.right, { kind: "value", value: 0 });
  });

  it("actions with both inc and dec get compound and-preconditions", () => {
    // Generate many seeds with mixed weights, find one with an action having both inc and dec
    const grammar = {
      limits: { minVariables: 3, maxVariables: 3, minActions: 1, maxActions: 1 },
      weights: { inc: 1, dec: 1 },
    };
    let foundCompound = false;
    for (let seed = 0; seed < 200; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar });
      for (const action of def.actions) {
        const hasInc = action.effects.some((e) => e.kind === "inc");
        const hasDec = action.effects.some((e) => e.kind === "dec");
        if (hasInc && hasDec && action.preconditions) {
          assert.equal(
            action.preconditions.kind,
            "and",
            `seed ${seed}: expected 'and' precondition for mixed inc/dec action`
          );
          foundCompound = true;
          break;
        }
      }
      if (foundCompound) break;
    }
    assert.ok(foundCompound, "should find at least one action with compound and-preconditions");
  });

  it("dec-only games pass schema and semantic validation for 100 seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: decOnlyGrammar });
      const schema = validateGameDefinition(def);
      assert.ok(schema.valid, `seed ${seed} schema: ${JSON.stringify(schema.errors)}`);
      const semantic = validateSemanticDefinition(def);
      assert.ok(semantic.valid, `seed ${seed} semantic: ${JSON.stringify(semantic.issues)}`);
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

  it("all element IDs use hyphens not underscores", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      for (const v of def.state.variables) {
        assert.ok(!v.id.includes("_"), `seed ${seed}: variable "${v.id}" contains underscore`);
      }
      for (const a of def.actions) {
        assert.ok(!a.id.includes("_"), `seed ${seed}: action "${a.id}" contains underscore`);
      }
      if (def.state.tokenTypes) {
        for (const t of def.state.tokenTypes) {
          assert.ok(!t.id.includes("_"), `seed ${seed}: token "${t.id}" contains underscore`);
        }
      }
      if (def.state.zones) {
        for (const z of def.state.zones) {
          assert.ok(!z.id.includes("_"), `seed ${seed}: zone "${z.id}" contains underscore`);
        }
      }
    }
  });

  it("all element IDs have numeric suffix", () => {
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const pattern = /-\d+$/;
      for (const v of def.state.variables) {
        assert.match(v.id, pattern, `seed ${seed}: variable "${v.id}" missing numeric suffix`);
      }
      for (const a of def.actions) {
        assert.match(a.id, pattern, `seed ${seed}: action "${a.id}" missing numeric suffix`);
      }
      if (def.state.tokenTypes) {
        for (const t of def.state.tokenTypes) {
          assert.match(t.id, pattern, `seed ${seed}: token "${t.id}" missing numeric suffix`);
        }
      }
      if (def.state.zones) {
        for (const z of def.state.zones) {
          assert.match(z.id, pattern, `seed ${seed}: zone "${z.id}" missing numeric suffix`);
        }
      }
    }
  });

  it("no IDs match legacy indexed patterns", () => {
    const legacyPatterns = [/^var_\d+$/, /^action_\d+$/, /^token_\d+$/, /^zone_\d+$/];
    for (let seed = 0; seed < 50; seed++) {
      const def = generateGameDefinition({ rng: makeRng(seed), grammar: defaultGrammar });
      const allIds = [
        ...def.state.variables.map((v) => v.id),
        ...def.actions.map((a) => a.id),
        ...(def.state.tokenTypes ?? []).map((t) => t.id),
        ...(def.state.zones ?? []).map((z) => z.id),
      ];
      for (const id of allIds) {
        for (const pattern of legacyPatterns) {
          assert.ok(!pattern.test(id), `seed ${seed}: "${id}" matches legacy pattern ${pattern}`);
        }
      }
    }
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
