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
  schedulerSwapMutation,
  turnOrderEffectInsertMutation,
  chooseEffectInsertMutation,
  workerCountTweakMutation,
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
  definition.actions[0].params.push({
    id: "piece2",
    kind: "token",
    domain: {
      selector: {
        zone: "board2",
        tokenType: "pawn2",
        count: 1,
      },
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

    it("skips targets where negation would be unsatisfiable (returns no-op)", () => {
      const definition = cloneDefinition(baseDefinition);
      // score min:0, max:10; precondition score < 15 is always true
      // NOT(score < 15) = impossible → should be filtered out
      definition.actions[0].preconditions = {
        kind: "cmp",
        op: "<",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 15 },
      };
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = preconditionNegationMutation.mutate(genome, rng);

      // No targets remain, so precondition should be unchanged (no-op)
      assert.equal(mutated.definition.actions[0].preconditions.kind, "cmp");
      assert.equal(mutated.definition.actions[0].preconditions.op, "<");
    });

    it("applies negation when result is satisfiable", () => {
      const definition = cloneDefinition(baseDefinition);
      // score min:0, max:10; precondition score >= 5 is NOT always true
      // NOT(score >= 5) = score < 5, which is possible
      definition.actions[0].preconditions = {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 5 },
      };
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = preconditionNegationMutation.mutate(genome, rng);

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
      assert.equal(mutated.definition.actions[0].params.length, 2);
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
      assert.equal(mutated.definition.actions[0].params[0].domain.selector.tokenType, "pawn2");
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
      assert.equal(mutated.definition.actions[0].params[0].domain.selector.zone, "board2");
      assert.equal(mutated.definition.actions[0].preconditions.ref.id, "board2");
      assert.equal(mutated.definition.actions[0].effects[1].toZone, "board2");
    });
  });

  describe("schedulerSwapMutation", () => {
    function makePriorityQueueDefinition() {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables.push({
        id: "time_pos",
        scope: "per_player",
        type: { kind: "int", min: 0, max: 100 },
        initial: 0,
      });
      definition.turn = {
        scheduler: "priority_queue",
        orderBy: { variable: "time_pos", direction: "asc" },
      };
      return definition;
    }

    function makeTokenHolderDefinition() {
      const definition = cloneDefinition(baseDefinition);
      definition.state.zones.push({
        id: "holder_zone",
        tokenType: "pawn",
        scope: "per_player",
        order: "ordered",
        visibility: "public",
      });
      definition.turn = {
        scheduler: "token_holder",
        tokenType: "pawn",
        zone: "holder_zone",
      };
      return definition;
    }

    it("swaps from round_robin to priority_queue and produces valid orderBy", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables.push({
        id: "time_pos",
        scope: "per_player",
        type: { kind: "int", min: 0, max: 100 },
        initial: 0,
      });
      const genome = { definition };
      // Use a seed that picks priority_queue (need per_player int var available)
      const rng = createSeededRng(42);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      // Should have swapped away from round_robin
      assert.notEqual(mutated.definition.turn.scheduler, "round_robin");
      if (mutated.definition.turn.scheduler === "priority_queue") {
        assert.ok(mutated.definition.turn.orderBy);
        assert.equal(mutated.definition.turn.orderBy.variable, "time_pos");
        assert.ok(["asc", "desc"].includes(mutated.definition.turn.orderBy.direction));
      }
    });

    it("swaps from priority_queue to another scheduler and produces valid fields", () => {
      const definition = makePriorityQueueDefinition();
      definition.state.zones.push({
        id: "holder_zone",
        tokenType: "pawn",
        scope: "per_player",
        order: "ordered",
        visibility: "public",
      });
      const genome = { definition };
      const rng = createSeededRng(7);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      assert.notEqual(mutated.definition.turn.scheduler, "priority_queue");
      if (mutated.definition.turn.scheduler === "round_robin") {
        assert.equal(mutated.definition.turn.orderBy, undefined);
        assert.equal(mutated.definition.turn.tokenType, undefined);
        assert.equal(mutated.definition.turn.zone, undefined);
      } else if (mutated.definition.turn.scheduler === "token_holder") {
        assert.ok(mutated.definition.turn.tokenType);
        assert.ok(mutated.definition.turn.zone);
        assert.equal(mutated.definition.turn.orderBy, undefined);
      }
    });

    it("swapping away from priority_queue removes orderBy, tokenType, and zone fields", () => {
      const definition = makePriorityQueueDefinition();
      const genome = { definition };
      // Candidates: round_robin and reactive (no per_player zones → token_holder excluded)
      const rng = createSeededRng(1);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      assert.notEqual(mutated.definition.turn.scheduler, "priority_queue");
      assert.equal(mutated.definition.turn.orderBy, undefined);
      assert.equal(mutated.definition.turn.tokenType, undefined);
      assert.equal(mutated.definition.turn.zone, undefined);
    });

    it("swaps to reactive when it is the only valid target", () => {
      // round_robin with no per_player int vars and no per_player zones
      // → priority_queue and token_holder excluded → only reactive is a candidate
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = createSeededRng(1);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "reactive");
    });

    it("is deterministic with seeded RNG", () => {
      const definition = makePriorityQueueDefinition();
      definition.state.zones.push({
        id: "holder_zone",
        tokenType: "pawn",
        scope: "per_player",
        order: "ordered",
        visibility: "public",
      });
      const genome = { definition };
      const result1 = schedulerSwapMutation.mutate(genome, createSeededRng(99));
      const result2 = schedulerSwapMutation.mutate(genome, createSeededRng(99));

      assert.deepStrictEqual(result1.definition.turn, result2.definition.turn);
    });

    it("output genome passes DSL schema validation when swapping to priority_queue", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables.push({
        id: "time_pos",
        scope: "per_player",
        type: { kind: "int", min: 0, max: 100 },
        initial: 0,
      });
      // Force priority_queue by removing per_player zones (so token_holder is not valid)
      // Only candidates: priority_queue
      definition.turn = { scheduler: "round_robin" };
      const genome = { definition };
      const rng = createSeededRng(1);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "priority_queue");
      const validation = validateGenomeDefinition(mutated.definition);
      assert.ok(validation.valid, `Schema validation failed: ${JSON.stringify(validation.errors)}`);
    });

    it("output genome passes DSL schema validation when swapping to token_holder", () => {
      const definition = makeTokenHolderDefinition();
      // Currently token_holder, swap to something else then swap back
      // First make it round_robin with per_player zone available
      definition.turn = { scheduler: "round_robin" };
      // Ensure no per_player int vars so only token_holder is a swap candidate
      definition.state.variables = definition.state.variables.filter(
        (v) => !(v.scope === "per_player" && v.type?.kind === "int"),
      );
      const genome = { definition };
      const rng = createSeededRng(1);
      const mutated = schedulerSwapMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "token_holder");
      const validation = validateGenomeDefinition(mutated.definition);
      assert.ok(validation.valid, `Schema validation failed: ${JSON.stringify(validation.errors)}`);
    });

    it("does not mutate the input genome", () => {
      const definition = makePriorityQueueDefinition();
      const genome = { definition };
      const originalTurn = structuredClone(definition.turn);
      schedulerSwapMutation.mutate(genome, createSeededRng(1));

      assert.deepStrictEqual(genome.definition.turn, originalTurn);
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

  describe("turnOrderEffectInsertMutation", () => {
    function makePerPlayerDefinition() {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables.push({
        id: "bid",
        scope: "per_player",
        type: { kind: "int", min: 0, max: 100 },
        initial: 0,
      });
      return definition;
    }

    it("creates an end_round trigger with set_turn_order effect", () => {
      const definition = makePerPlayerDefinition();
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = turnOrderEffectInsertMutation.mutate(genome, rng);

      const triggers = mutated.definition.triggers;
      assert.ok(Array.isArray(triggers));
      const endRound = triggers.find((t) => t.event === "end_round");
      assert.ok(endRound, "should have an end_round trigger");
      const sto = endRound.effects.find((e) => e.kind === "set_turn_order");
      assert.ok(sto, "should have a set_turn_order effect");
      assert.equal(sto.variable, "bid");
      assert.ok(["asc", "desc"].includes(sto.direction));
    });

    it("appends to existing end_round trigger instead of creating a duplicate", () => {
      const definition = makePerPlayerDefinition();
      definition.triggers = [
        { event: "end_round", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      ];
      const genome = { definition };
      const rng = createSeededRng(2);

      const mutated = turnOrderEffectInsertMutation.mutate(genome, rng);

      const endRoundTriggers = mutated.definition.triggers.filter((t) => t.event === "end_round");
      assert.equal(endRoundTriggers.length, 1, "should not duplicate end_round triggers");
      assert.equal(endRoundTriggers[0].effects.length, 2, "should have original + new effect");
      assert.equal(endRoundTriggers[0].effects[1].kind, "set_turn_order");
    });

    it("creates a per-player int variable and adds trigger when none exist", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = turnOrderEffectInsertMutation.mutate(genome, rng);

      // pickOrCreateVariable now creates a per_player int variable
      const perPlayerVars = mutated.definition.state.variables.filter(
        (v) => v.scope === "per_player" && v.type?.kind === "int",
      );
      assert.ok(perPlayerVars.length > 0, "should have created a per_player int variable");
      const triggers = mutated.definition.triggers ?? [];
      const setTurnOrder = triggers.flatMap((t) => t.effects ?? []).find(
        (e) => e.kind === "set_turn_order",
      );
      assert.ok(setTurnOrder, "should have added a set_turn_order effect");
    });

    it("is deterministic with seeded RNG", () => {
      const definition = makePerPlayerDefinition();
      const result1 = turnOrderEffectInsertMutation.mutate({ definition }, createSeededRng(42));
      const result2 = turnOrderEffectInsertMutation.mutate(
        { definition: cloneDefinition(definition) },
        createSeededRng(42),
      );

      assert.deepStrictEqual(result1.definition.triggers, result2.definition.triggers);
    });

    it("does not mutate the input genome", () => {
      const definition = makePerPlayerDefinition();
      const genome = { definition };
      const originalTriggers = structuredClone(definition.triggers);
      turnOrderEffectInsertMutation.mutate(genome, createSeededRng(1));

      assert.deepStrictEqual(genome.definition.triggers, originalTriggers);
    });
  });

  describe("chooseEffectInsertMutation", () => {
    it("wraps an effect in a choose block with two options", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = chooseEffectInsertMutation.mutate(genome, rng);

      const effects = mutated.definition.actions[0].effects;
      const chooseEffect = effects.find((e) => e.kind === "rng_choose");
      assert.ok(chooseEffect, "should have a choose effect");
      assert.equal(chooseEffect.count, 1);
      assert.ok(Array.isArray(chooseEffect.options));
      assert.equal(chooseEffect.options.length, 2, "should have two options");
      // First option should contain the original effect
      assert.ok(Array.isArray(chooseEffect.options[0]));
      assert.equal(chooseEffect.options[0].length, 1);
      assert.equal(chooseEffect.options[0][0].kind, "inc");
      // Second option should be a generated alternative
      assert.ok(Array.isArray(chooseEffect.options[1]));
      assert.equal(chooseEffect.options[1].length, 1);
    });

    it("returns unchanged genome when no action effects exist", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.actions[0].effects = [];
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = chooseEffectInsertMutation.mutate(genome, rng);

      assert.deepStrictEqual(mutated.definition.actions[0].effects, []);
    });

    it("is deterministic with seeded RNG", () => {
      const definition = cloneDefinition(baseDefinition);
      const result1 = chooseEffectInsertMutation.mutate({ definition }, createSeededRng(7));
      const result2 = chooseEffectInsertMutation.mutate(
        { definition: cloneDefinition(definition) },
        createSeededRng(7),
      );

      assert.deepStrictEqual(result1.definition.actions, result2.definition.actions);
    });

    it("does not mutate the input genome", () => {
      const definition = cloneDefinition(baseDefinition);
      const genome = { definition };
      const originalEffects = structuredClone(definition.actions[0].effects);
      chooseEffectInsertMutation.mutate(genome, createSeededRng(1));

      assert.deepStrictEqual(genome.definition.actions[0].effects, originalEffects);
    });
  });

  describe("workerCountTweakMutation", () => {
    function makeSpawnTriggerDefinition() {
      const definition = cloneDefinition(baseDefinition);
      definition.triggers = [
        {
          event: "start_round",
          effects: [
            {
              kind: "spawn",
              target: { kind: "token", id: "pawn" },
              toZone: "board",
              count: 3,
            },
          ],
        },
      ];
      return definition;
    }

    function makeSpawnActionDefinition() {
      const definition = cloneDefinition(baseDefinition);
      definition.actions[0].effects = [
        {
          kind: "spawn",
          target: { kind: "token", id: "pawn" },
          toZone: "board",
          count: 2,
        },
      ];
      return definition;
    }

    it("adjusts spawn count in a trigger by ±1", () => {
      const definition = makeSpawnTriggerDefinition();
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = workerCountTweakMutation.mutate(genome, rng);

      const newCount = mutated.definition.triggers[0].effects[0].count;
      assert.ok(newCount === 2 || newCount === 4, `expected 2 or 4, got ${newCount}`);
    });

    it("adjusts spawn count in an action effect by ±1", () => {
      const definition = makeSpawnActionDefinition();
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = workerCountTweakMutation.mutate(genome, rng);

      const newCount = mutated.definition.actions[0].effects[0].count;
      assert.ok(newCount === 1 || newCount === 3, `expected 1 or 3, got ${newCount}`);
    });

    it("clamps spawn count to minimum of 1", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.triggers = [
        {
          event: "start_round",
          effects: [
            {
              kind: "spawn",
              target: { kind: "token", id: "pawn" },
              toZone: "board",
              count: 1,
            },
          ],
        },
      ];
      const genome = { definition };
      // Try multiple seeds — at least one should attempt -1 on count 1
      let foundClamped = false;
      for (let seed = 0; seed < 20; seed++) {
        const mutated = workerCountTweakMutation.mutate(genome, createSeededRng(seed));
        const count = mutated.definition.triggers[0].effects[0].count;
        assert.ok(count >= 1, `count must be >= 1, got ${count}`);
        if (count === 1) {
          foundClamped = true;
        }
      }
      assert.ok(foundClamped, "should clamp to 1 when delta is -1 on count 1");
    });

    it("returns unchanged genome when no spawn effects exist", () => {
      const definition = cloneDefinition(baseDefinition);
      // default baseDefinition has inc effects, not spawn
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = workerCountTweakMutation.mutate(genome, rng);

      assert.deepStrictEqual(mutated.definition, definition);
    });

    it("defaults count to 1 when spawn effect has no count field", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.actions[0].effects = [
        {
          kind: "spawn",
          target: { kind: "token", id: "pawn" },
          toZone: "board",
          // no count field — defaults to 1
        },
      ];
      const genome = { definition };
      const rng = createSeededRng(1);

      const mutated = workerCountTweakMutation.mutate(genome, rng);

      const newCount = mutated.definition.actions[0].effects[0].count;
      assert.ok(newCount >= 1, `expected >= 1, got ${newCount}`);
      assert.ok(newCount <= 2, `expected <= 2, got ${newCount}`);
    });

    it("is deterministic with seeded RNG", () => {
      const definition = makeSpawnTriggerDefinition();
      const result1 = workerCountTweakMutation.mutate({ definition }, createSeededRng(5));
      const result2 = workerCountTweakMutation.mutate(
        { definition: cloneDefinition(definition) },
        createSeededRng(5),
      );

      assert.deepStrictEqual(result1.definition.triggers, result2.definition.triggers);
    });

    it("does not mutate the input genome", () => {
      const definition = makeSpawnTriggerDefinition();
      const genome = { definition };
      const originalCount = definition.triggers[0].effects[0].count;
      workerCountTweakMutation.mutate(genome, createSeededRng(1));

      assert.equal(genome.definition.triggers[0].effects[0].count, originalCount);
    });
  });

  describe("mutateAndRepairGenome", () => {
    it("returns noOp or repairFailed on invalid int bounds", () => {
      const definition = cloneDefinition(baseDefinition);
      definition.state.variables[0].type = { kind: "int", min: 5, max: 1 };
      const genome = { definition };
      const selector = { pick: () => "numeric-tweak" };

      const result = mutateAndRepairGenome(genome, {
        operators: [numericTweakMutation],
        selector,
      });

      assert.ok(
        result.outcome === "noOp" || result.outcome === "repairFailed",
        `Expected noOp or repairFailed, got ${result.outcome}`,
      );
      assert.equal(result.operatorName, "numeric-tweak");
    });
  });
});
