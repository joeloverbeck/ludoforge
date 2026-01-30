import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  booleanToggleMutation,
  actionDuplicateMutation,
  actionEffectMagnitudeMutation,
  actionRemoveMutation,
  enumCycleMutation,
  mutateAndRepairGenome,
  numericTweakMutation,
  preconditionNegationMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  terminationOutcomeMutation,
  terminationThresholdMutation,
  tokenTypeZoneTargetAddMutation,
  tokenTypeRemoveMutation,
  zoneRemoveMutation,
} from "../../../src/evolutionary-engine/mutation.js";
import { repairGenome } from "../../../src/evolutionary-engine/repair.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";
import { validateGenomeDefinition } from "../../../src/evolutionary-engine/serialization.js";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function makeBoolDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.variables.push({
    id: "flag",
    scope: "global",
    type: { kind: "bool" },
    initial: false,
  });
  return definition;
}

function makeEnumDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.tokenTypes[0].attributes.push({
    id: "color",
    scope: "global",
    type: { kind: "enum", values: ["red", "blue"] },
    initial: "red",
  });
  return definition;
}

function makePreconditionDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.actions[0].preconditions = {
    kind: "cmp",
    op: ">=",
    left: { kind: "ref", ref: { kind: "var", id: "score" } },
    right: { kind: "value", value: 1 },
  };
  return definition;
}

function makeTwoActionDefinition() {
  const definition = cloneDefinition(baseDefinition);
  const clonedAction = structuredClone(definition.actions[0]);
  clonedAction.id = "wait";
  definition.actions.push(clonedAction);
  return definition;
}

function makeTokenTypeRemovalDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.tokenTypes.push({ id: "pawn2", attributes: [] });
  definition.state.zones.push({
    id: "board2",
    tokenType: "pawn2",
    scope: "global",
    order: "ordered",
    visibility: "public",
  });
  definition.actions[0].targets.push({
    id: "piece2",
    kind: "token",
    selector: {
      zone: "board2",
      tokenType: "pawn2",
      count: 1,
    },
  });
  definition.actions[0].preconditions = {
    kind: "ref",
    ref: { kind: "token", id: "pawn" },
  };
  definition.actions[0].effects.push({
    kind: "move",
    target: { kind: "token", id: "pawn", attribute: "owner" },
    toZone: "board",
  });
  return definition;
}

function makeZoneRemovalDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.zones.push({
    id: "board2",
    tokenType: "pawn",
    scope: "global",
    order: "ordered",
    visibility: "public",
  });
  definition.actions[0].preconditions = {
    kind: "ref",
    ref: { kind: "zone", id: "board" },
  };
  definition.actions[0].effects.push({
    kind: "move",
    target: { kind: "token", id: "pawn" },
    toZone: "board",
  });
  return definition;
}

describe("mutation", () => {
  describe("numericTweakMutation", () => {
    it("adjusts int initial within bounds without mutating input", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };

      const mutated = numericTweakMutation.mutate(genome, createSeededRng(1));

      assert.notStrictEqual(mutated.definition, definition);
      assert.equal(definition.state.variables[0].initial, 0);
      assert.equal(mutated.definition.state.variables[0].initial, 1);
    });
  });

  describe("booleanToggleMutation", () => {
    it("flips boolean variable initial", () => {
      const definition = makeBoolDefinition();
      const genome = { definition };

      const mutated = booleanToggleMutation.mutate(genome, createSeededRng(2));

      const boolIndex = mutated.definition.state.variables.findIndex((variable) => variable.id === "flag");
      assert.equal(definition.state.variables[boolIndex].initial, false);
      assert.equal(mutated.definition.state.variables[boolIndex].initial, true);
    });
  });

  describe("enumCycleMutation", () => {
    it("changes enum initial values", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = enumCycleMutation.mutate(genome, rng);

      assert.equal(definition.state.tokenTypes[0].attributes[0].initial, "a");
      assert.equal(mutated.definition.state.tokenTypes[0].attributes[0].initial, "b");
    });
  });

  describe("actionDuplicateMutation", () => {
    it("clones an action and assigns a new id", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = actionDuplicateMutation.mutate(genome, rng);

      assert.equal(definition.actions.length, 1);
      assert.equal(mutated.definition.actions.length, 2);
      assert.equal(definition.actions[0].id, "move");
      assert.notEqual(mutated.definition.actions[1].id, "move");
    });
  });

  describe("actionRemoveMutation", () => {
    it("is a no-op when only one action exists", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = actionRemoveMutation.mutate(genome, rng);

      assert.equal(definition.actions.length, 1);
      assert.deepStrictEqual(mutated.definition, definition);
    });

    it("removes an action when multiple exist", () => {
      const definition = makeTwoActionDefinition();
      const genome = { definition };
      const rng = { nextInt: () => 1 };

      const mutated = actionRemoveMutation.mutate(genome, rng);

      assert.equal(definition.actions.length, 2);
      assert.equal(mutated.definition.actions.length, 1);
    });
  });

  describe("actionEffectMagnitudeMutation", () => {
    it("nudges effect amounts without mutating input", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = actionEffectMagnitudeMutation.mutate(genome, rng);

      assert.equal(definition.actions[0].effects[0].amount, 1);
      assert.equal(mutated.definition.actions[0].effects[0].amount, 0);
    });

    it("ignores effects whose kind is not inc or dec", () => {
      const definition = cloneDefinition(baseDefinition);
      // Replace all effects with non-numeric kinds so no targets match
      definition.actions[0].effects = [
        { kind: "set", target: { kind: "var", id: "score" }, value: 5 },
        { kind: "move", target: { kind: "token", id: "pawn" }, zone: "z1" },
      ];
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = actionEffectMagnitudeMutation.mutate(genome, rng);

      // No targets matched, so definition should be unchanged (deep-equal clone)
      assert.deepStrictEqual(mutated.definition.actions[0].effects, [
        { kind: "set", target: { kind: "var", id: "score" }, value: 5 },
        { kind: "move", target: { kind: "token", id: "pawn" }, zone: "z1" },
      ]);
    });

    it("only targets inc and dec effects in a mixed-kind action", () => {
      const definition = cloneDefinition(baseDefinition);
      // First action has an inc effect (from fixture) — that should be targeted
      // Add a set effect that should be ignored
      definition.actions[0].effects.push(
        { kind: "set", target: { kind: "var", id: "score" }, value: 99 }
      );
      const genome = { definition };
      // rng returns 0 → picks first matching target (the inc effect)
      const rng = { nextInt: () => 0 };

      const mutated = actionEffectMagnitudeMutation.mutate(genome, rng);

      // The inc effect amount should be tweaked
      assert.notEqual(
        mutated.definition.actions[0].effects[0].amount,
        definition.actions[0].effects[0].amount
      );
      // The set effect should remain untouched
      assert.deepStrictEqual(mutated.definition.actions[0].effects[1], {
        kind: "set",
        target: { kind: "var", id: "score" },
        value: 99,
      });
    });
  });

  describe("preconditionNegationMutation", () => {
    it("wraps an existing precondition", () => {
      const definition = makePreconditionDefinition();
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = preconditionNegationMutation.mutate(genome, rng);

      assert.equal(definition.actions[0].preconditions.kind, "cmp");
      assert.equal(mutated.definition.actions[0].preconditions.kind, "not");
    });
  });

  describe("terminationThresholdMutation", () => {
    it("nudges termination thresholds within bounds", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = terminationThresholdMutation.mutate(genome, rng);

      assert.equal(definition.termination.conditions[0].condition.right.value, 10);
      assert.equal(mutated.definition.termination.conditions[0].condition.right.value, 9);
    });
  });

  describe("terminationOutcomeMutation", () => {
    it("changes outcome types", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = terminationOutcomeMutation.mutate(genome, rng);

      assert.equal(definition.termination.conditions[0].outcome.type, "win");
      assert.notEqual(mutated.definition.termination.conditions[0].outcome.type, "win");
    });
  });

  describe("phaseAddMutation", () => {
    it("appends a phase label", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = phaseAddMutation.mutate(genome, rng);

      assert.ok(Array.isArray(mutated.definition.turn.phases));
      assert.equal(mutated.definition.turn.phases.length, 1);
    });
  });

  describe("phaseRemoveMutation", () => {
    it("is a no-op when only one phase exists", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.turn = { ...definition.turn, phases: ["main"] };
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = phaseRemoveMutation.mutate(genome, rng);

      assert.deepStrictEqual(mutated.definition, definition);
    });

    it("removes a phase when multiple exist", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.turn.phases = ["setup", "main"];
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = phaseRemoveMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.phases.length, 1);
    });
  });

  describe("tokenTypeZoneTargetAddMutation", () => {
    it("adds referenced token types and zones", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = tokenTypeZoneTargetAddMutation.mutate(genome, rng);
      const validation = validateGenomeDefinition(mutated.definition);

      assert.ok(validation.valid);
      assert.equal(mutated.definition.state.tokenTypes.length, 2);
      assert.equal(mutated.definition.state.zones.length, 2);
      assert.equal(mutated.definition.actions[0].targets.length, 2);
    });
  });

  describe("tokenTypeRemoveMutation", () => {
    it("is a no-op when only one token type exists", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = tokenTypeRemoveMutation.mutate(genome, rng);

      assert.deepStrictEqual(mutated.definition, definition);
    });

    it("rewrites token references to remaining token types", () => {
      const definition = makeTokenTypeRemovalDefinition();
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = tokenTypeRemoveMutation.mutate(genome, rng);
      const validation = validateGenomeDefinition(mutated.definition);

      assert.ok(validation.valid);
      assert.equal(mutated.definition.state.tokenTypes.length, 1);
      assert.equal(mutated.definition.state.zones[0].tokenType, "pawn2");
      assert.equal(mutated.definition.actions[0].targets[0].selector.tokenType, "pawn2");
      assert.equal(mutated.definition.actions[0].preconditions.ref.id, "pawn2");
      assert.equal(mutated.definition.actions[0].effects[1].target.id, "pawn2");
      assert.equal(mutated.definition.actions[0].effects[1].target.attribute, undefined);
    });
  });

  describe("zoneRemoveMutation", () => {
    it("is a no-op when only one zone exists", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = zoneRemoveMutation.mutate(genome, rng);

      assert.deepStrictEqual(mutated.definition, definition);
    });

    it("rewrites zone references to remaining zones", () => {
      const definition = makeZoneRemovalDefinition();
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = zoneRemoveMutation.mutate(genome, rng);
      const validation = validateGenomeDefinition(mutated.definition);

      assert.ok(validation.valid);
      assert.equal(mutated.definition.state.zones.length, 1);
      assert.equal(mutated.definition.actions[0].targets[0].selector.zone, "board2");
      assert.equal(mutated.definition.actions[0].preconditions.ref.id, "board2");
      assert.equal(mutated.definition.actions[0].effects[1].toZone, "board2");
    });
  });

  describe("repairGenome", () => {
    it("clamps int initial and restores enum defaults", () => {
      const definition = makeEnumDefinition();
      definition.state.variables[0].initial = 999;
      definition.state.tokenTypes[0].attributes[1].initial = "green";
      const genome = { definition };

      const repaired = repairGenome(genome);

      assert.ok(repaired);
      assert.equal(repaired.definition.state.variables[0].initial, 10);
      assert.equal(repaired.definition.state.tokenTypes[0].attributes[1].initial, "red");
    });
  });

  describe("mutateAndRepairGenome", () => {
    it("falls back to original genome on invalid int bounds", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables[0].type = { kind: "int", min: 5, max: 1 };
      const genome = { definition };

      const repaired = mutateAndRepairGenome(genome, {
        operators: [numericTweakMutation],
      });

      assert.deepEqual(repaired, genome);
      assert.notEqual(repaired, genome);
    });
  });
});
