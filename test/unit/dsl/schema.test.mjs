import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import {
  baseDefinition,
  exampleDefinition,
  missingTerminationDefinition
} from "./fixtures.mjs";

const schemaJson = JSON.parse(
  await readFile(new URL("../../../schemas/dsl/game-definition.v1.json", import.meta.url))
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function assertValid(definition) {
  const ok = validate(definition);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(definition) {
  const ok = validate(definition);
  assert.equal(ok, false, "Expected schema validation to fail");
}

describe("schema", () => {
  describe("valid definitions", () => {
    it("accepts a valid game definition", () => {
      assertValid(cloneDefinition(baseDefinition));
    });

    it("accepts the minimal example definition", () => {
      assertValid(cloneDefinition(exampleDefinition));
    });

    it("accepts meta refs in expressions", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.termination.conditions[0].condition = {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
        right: { kind: "value", value: 0 },
      };
      assertValid(candidate);
    });

    it("accepts noLegalActions terminate with defaultOutcome", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn.noLegalActions = {
        policy: "terminate",
        defaultOutcome: { type: "draw", players: "all" },
        reason: "no-legal-actions",
      };
      assertValid(candidate);
    });

    it("accepts conditional effects", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects = [
        {
          kind: "conditional",
          condition: { kind: "value", value: true },
          then: [{ kind: "set", target: { kind: "var", id: "score" }, value: 1 }],
          else: [{ kind: "set", target: { kind: "var", id: "score" }, value: 2 }],
        },
      ];
      assertValid(candidate);
    });

    it("accepts token_holder scheduler with tokenType and zone", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.state.zones.push({
        id: "hand",
        tokenType: "pawn",
        scope: "per_player",
        order: "unordered",
        visibility: "public",
      });
      candidate.turn = {
        scheduler: "token_holder",
        tokenType: "pawn",
        zone: "hand",
      };
      assertValid(candidate);
    });

    it("accepts random_draw scheduler", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn = { scheduler: "random_draw" };
      assertValid(candidate);
    });

    it("accepts simultaneous scheduler with resolution order", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn = {
        scheduler: "simultaneous",
        resolution: { order: "by_player_id" },
      };
      assertValid(candidate);
    });
  });

  describe("rejected definitions", () => {
    it("rejects missing version", () => {
      const candidate = structuredClone(baseDefinition);
      delete candidate.version;
      assertInvalid(candidate);
    });

    it("rejects missing termination fixture", () => {
      assertInvalid(cloneDefinition(missingTerminationDefinition));
    });

    it("rejects invalid enum values", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].actor = "npc";
      assertInvalid(candidate);
    });

    it("rejects invalid meta ids in expressions", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.termination.conditions[0].condition = {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "meta", id: "unknownMeta" } },
        right: { kind: "value", value: 0 },
      };
      assertInvalid(candidate);
    });

    it("rejects meta refs as effect targets", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects[0].target = { kind: "meta", id: "legalActionCount" };
      assertInvalid(candidate);
    });

    it("rejects noLegalActions terminate without defaultOutcome", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn.noLegalActions = { policy: "terminate" };
      assertInvalid(candidate);
    });

    it("rejects noLegalActions pass with defaultOutcome", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn.noLegalActions = {
        policy: "pass",
        defaultOutcome: { type: "draw", players: "all" },
      };
      assertInvalid(candidate);
    });

    it("rejects missing required state variables", () => {
      const candidate = structuredClone(baseDefinition);
      delete candidate.state.variables;
      assertInvalid(candidate);
    });

    it("rejects player count below 1", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.players.count = 0;
      assertInvalid(candidate);
    });

    it("rejects effect with kind 'random'", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects = [
        {
          kind: "random",
          target: { kind: "var", id: "score" },
          amount: 1,
        },
      ];
      assertInvalid(candidate);
    });

    it("rejects effect with kind 'foreach'", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects = [
        {
          kind: "foreach",
          target: { kind: "var", id: "score" },
          amount: 1,
        },
      ];
      assertInvalid(candidate);
    });

    it("rejects conditional effect missing condition", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects = [
        {
          kind: "conditional",
          then: [{ kind: "set", target: { kind: "var", id: "score" }, value: 1 }],
        },
      ];
      assertInvalid(candidate);
    });

    it("rejects conditional effect missing then", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.actions[0].effects = [
        {
          kind: "conditional",
          condition: { kind: "value", value: true },
        },
      ];
      assertInvalid(candidate);
    });

    it("rejects token_holder scheduler missing tokenType", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.state.zones.push({
        id: "hand",
        tokenType: "pawn",
        scope: "per_player",
        order: "unordered",
        visibility: "public",
      });
      candidate.turn = {
        scheduler: "token_holder",
        zone: "hand",
      };
      assertInvalid(candidate);
    });

    it("rejects token_holder scheduler missing zone", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn = {
        scheduler: "token_holder",
        tokenType: "pawn",
      };
      assertInvalid(candidate);
    });

    it("rejects simultaneous scheduler with invalid resolution order", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.turn = {
        scheduler: "simultaneous",
        resolution: { order: "clockwise" },
      };
      assertInvalid(candidate);
    });
  });

  describe("remaining valid effect kinds", () => {
    for (const kind of ["set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide"]) {
      it(`accepts effect with kind '${kind}'`, () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind,
            target: { kind: "var", id: "score" },
            ...(kind === "inc" || kind === "dec" ? { amount: 1 } : {}),
            ...(kind === "set" ? { value: 5 } : {}),
            ...(kind === "move" || kind === "spawn" ? { toZone: "board" } : {}),
          },
        ];
        assertValid(candidate);
      });
    }
  });
});
