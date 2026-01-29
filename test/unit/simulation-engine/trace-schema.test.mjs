import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const schemaJson = JSON.parse(
  await readFile(
    new URL(
      "../../../schemas/simulation-engine/simulation-result.schema.json",
      import.meta.url
    )
  )
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

function buildMinimalStep(overrides = {}) {
  return {
    turn: 1,
    phase: "main",
    playerId: 0,
    actionId: "tick",
    legalActionCount: 1,
    affectedPlayerIds: [0],
    affectedGlobal: false,
    state: {},
    ...overrides,
  };
}

function buildMinimalResult(stepOverrides = {}) {
  return {
    trajectory: {
      steps: [buildMinimalStep(stepOverrides)],
      events: [],
    },
    outcome: { outcomes: { "0": "win" } },
    terminationReason: "condition",
    terminated: true,
  };
}

function assertValid(result) {
  const ok = validate(result);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(result) {
  const ok = validate(result);
  assert.equal(ok, false, "Expected schema validation to fail");
}

describe("trace-schema", () => {
  describe("TrajectoryStep with trace fields", () => {
    it("accepts a step without trace fields (backward-compatible)", () => {
      assertValid(buildMinimalResult());
    });

    it("accepts a step with all trace fields present", () => {
      assertValid(
        buildMinimalResult({
          stateHash: "abc123",
          bindings: { counter: 5 },
          appliedEffects: [
            {
              kind: "inc",
              target: { kind: "var", id: "counter" },
              source: "effect",
              amount: 1,
            },
          ],
        })
      );
    });

    it("accepts a step with empty bindings and empty appliedEffects", () => {
      assertValid(
        buildMinimalResult({
          stateHash: "def456",
          bindings: {},
          appliedEffects: [],
        })
      );
    });

    it("rejects stateHash with wrong type", () => {
      assertInvalid(buildMinimalResult({ stateHash: 123 }));
    });

    it("rejects bindings with invalid BindingValue", () => {
      assertInvalid(buildMinimalResult({ bindings: { x: true } }));
    });

    it("accepts bindings with string values", () => {
      assertValid(buildMinimalResult({ bindings: { zone: "market" } }));
    });

    it("accepts bindings with number values", () => {
      assertValid(buildMinimalResult({ bindings: { amount: 3 } }));
    });

    it("accepts bindings with array values", () => {
      assertValid(
        buildMinimalResult({ bindings: { targets: ["a", "b"] } })
      );
      assertValid(
        buildMinimalResult({ bindings: { amounts: [1, 2, 3] } })
      );
    });

    it("rejects bindings with nested object values", () => {
      assertInvalid(buildMinimalResult({ bindings: { x: { nested: 1 } } }));
    });
  });

  describe("AppliedEffect", () => {
    it("requires kind, target, and source", () => {
      assertValid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "var", id: "hp" },
              source: "cost",
            },
          ],
        })
      );
    });

    it("rejects AppliedEffect missing kind", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            { target: { kind: "var", id: "hp" }, source: "effect" },
          ],
        })
      );
    });

    it("rejects AppliedEffect missing target", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [{ kind: "inc", source: "effect" }],
        })
      );
    });

    it("rejects AppliedEffect missing source", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            { kind: "inc", target: { kind: "var", id: "counter" } },
          ],
        })
      );
    });

    it("rejects invalid source enum value", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "inc",
              target: { kind: "var", id: "counter" },
              source: "invalid",
            },
          ],
        })
      );
    });

    it("accepts all valid source values", () => {
      for (const source of ["cost", "effect", "trigger"]) {
        assertValid(
          buildMinimalResult({
            appliedEffects: [
              {
                kind: "dec",
                target: { kind: "var", id: "gold" },
                source,
                amount: 2,
              },
            ],
          })
        );
      }
    });

    it("accepts optional amount field", () => {
      assertValid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "inc",
              target: { kind: "var", id: "counter" },
              source: "effect",
              amount: 5,
            },
          ],
        })
      );
    });

    it("accepts optional value field", () => {
      assertValid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "var", id: "flag" },
              source: "trigger",
              value: true,
            },
          ],
        })
      );
    });

    it("rejects unknown properties on AppliedEffect", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "inc",
              target: { kind: "var", id: "counter" },
              source: "effect",
              bogus: true,
            },
          ],
        })
      );
    });
  });

  describe("ResolvedRef", () => {
    it("accepts all valid kind values", () => {
      for (const kind of ["var", "token", "zone", "player"]) {
        assertValid(
          buildMinimalResult({
            appliedEffects: [
              {
                kind: "set",
                target: { kind, id: "test-id" },
                source: "effect",
              },
            ],
          })
        );
      }
    });

    it("rejects invalid kind enum value", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "resource", id: "gold" },
              source: "effect",
            },
          ],
        })
      );
    });

    it("rejects ResolvedRef missing id", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "var" },
              source: "effect",
            },
          ],
        })
      );
    });

    it("rejects ResolvedRef missing kind", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { id: "counter" },
              source: "effect",
            },
          ],
        })
      );
    });

    it("accepts scope property on ResolvedRef", () => {
      assertValid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "var", id: "counter", scope: "global" },
              source: "effect",
            },
          ],
        })
      );
    });

    it("rejects unknown properties on ResolvedRef", () => {
      assertInvalid(
        buildMinimalResult({
          appliedEffects: [
            {
              kind: "set",
              target: { kind: "var", id: "counter", bogus: true },
              source: "effect",
            },
          ],
        })
      );
    });
  });

  describe("multiple appliedEffects ordering", () => {
    it("accepts multiple effects in sequence", () => {
      assertValid(
        buildMinimalResult({
          stateHash: "hash1",
          bindings: { target: "player-0" },
          appliedEffects: [
            {
              kind: "dec",
              target: { kind: "var", id: "gold" },
              source: "cost",
              amount: 3,
            },
            {
              kind: "inc",
              target: { kind: "var", id: "vp" },
              source: "effect",
              amount: 1,
            },
            {
              kind: "set",
              target: { kind: "var", id: "triggered" },
              source: "trigger",
              value: true,
            },
          ],
        })
      );
    });
  });
});
