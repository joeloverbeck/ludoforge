import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { schedulerParamTweakMutation } from "../../../src/evolutionary-engine/mutation.js";

/**
 * Creates a definition with a priority_queue scheduler.
 * @param {object} [overrides]
 */
function makePriorityQueueDef(overrides = {}) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "time", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
        { id: "energy", scope: "per_player", type: { kind: "int", min: 0, max: 50 }, initial: 10 },
      ],
      tokenTypes: [],
      zones: [],
      ...(overrides.state ?? {}),
    },
    actions: [
      {
        id: "wait",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "time" }, amount: 1 }],
      },
    ],
    turn: {
      scheduler: "priority_queue",
      orderBy: { variable: "time", direction: "asc" },
      ...(overrides.turn ?? {}),
    },
    termination: {
      conditions: [
        {
          condition: { kind: "cmp", op: ">=", left: { kind: "ref", ref: { kind: "var", id: "time" } }, right: { kind: "value", value: 100 } },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 50,
    },
  };
}

/**
 * Creates a definition with a token_holder scheduler.
 * @param {object} [overrides]
 */
function makeTokenHolderDef(overrides = {}) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [],
      tokenTypes: [
        { id: "action_token", attributes: [] },
        { id: "bonus_token", attributes: [] },
      ],
      zones: [
        { id: "hand", tokenType: "action_token", scope: "per_player", order: "unordered", visibility: "private" },
        { id: "hand2", tokenType: "action_token", scope: "per_player", order: "unordered", visibility: "private" },
        { id: "bonus_zone", tokenType: "bonus_token", scope: "per_player", order: "unordered", visibility: "public" },
      ],
      ...(overrides.state ?? {}),
    },
    actions: [
      {
        id: "act",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      },
    ],
    turn: {
      scheduler: "token_holder",
      tokenType: "action_token",
      zone: "hand",
      ...(overrides.turn ?? {}),
    },
    termination: {
      conditions: [],
      maxTurns: 20,
    },
  };
}

/**
 * Creates a definition with round_robin scheduler.
 */
function makeRoundRobinDef() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: { variables: [], tokenTypes: [], zones: [] },
    actions: [
      {
        id: "noop",
        actor: "player",
        effects: [],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [], maxTurns: 10 },
  };
}

describe("schedulerParamTweakMutation", () => {
  describe("priority_queue", () => {
    it("flips direction from asc to desc", () => {
      const definition = makePriorityQueueDef();
      const genome = { definition };
      // rng returns 0 → picks first choice (flip_direction when both available)
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "priority_queue");
      assert.equal(mutated.definition.turn.orderBy.direction, "desc");
      assert.equal(mutated.definition.turn.orderBy.variable, "time");
    });

    it("flips direction from desc to asc", () => {
      const definition = makePriorityQueueDef({
        turn: { orderBy: { variable: "time", direction: "desc" } },
      });
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.orderBy.direction, "asc");
    });

    it("swaps variable to a different valid per-player variable", () => {
      const definition = makePriorityQueueDef();
      const genome = { definition };
      // rng returns 1 → picks second choice (swap_variable)
      // then returns 0 → picks first candidate after filtering current
      const rng = { nextInt: (n) => (n === 2 ? 1 : 0) };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "priority_queue");
      assert.equal(mutated.definition.turn.orderBy.variable, "energy");
      assert.equal(mutated.definition.turn.orderBy.direction, "asc");
    });

    it("is a no-op when orderBy is missing", () => {
      const definition = makePriorityQueueDef();
      delete definition.turn.orderBy;
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "priority_queue");
      assert.equal(mutated.definition.turn.orderBy, undefined);
    });

    it("only flips direction when a single per-player int var exists", () => {
      const definition = makePriorityQueueDef({
        state: {
          variables: [
            { id: "time", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
          ],
          tokenTypes: [],
          zones: [],
        },
      });
      const genome = { definition };
      // Only flip_direction is a valid choice
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.orderBy.direction, "desc");
      assert.equal(mutated.definition.turn.orderBy.variable, "time");
    });
  });

  describe("token_holder", () => {
    it("swaps tokenType to a different valid token type", () => {
      const definition = makeTokenHolderDef();
      const genome = { definition };
      // rng: first call picks swap_token_type (0), then picks first candidate
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "token_holder");
      assert.equal(mutated.definition.turn.tokenType, "bonus_token");
      assert.equal(mutated.definition.turn.zone, "bonus_zone");
    });

    it("swaps zone to a different valid per-player zone", () => {
      const definition = makeTokenHolderDef();
      const genome = { definition };
      // rng: first call (2 choices) → 1 for swap_zone, then 0 for pickDifferentValue
      const rng = { nextInt: (n) => (n === 2 ? 1 : 0) };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "token_holder");
      assert.equal(mutated.definition.turn.tokenType, "action_token");
      assert.equal(mutated.definition.turn.zone, "hand2");
    });

    it("is a no-op when only one token type and one zone exist", () => {
      const definition = makeTokenHolderDef({
        state: {
          variables: [],
          tokenTypes: [{ id: "action_token", attributes: [] }],
          zones: [
            { id: "hand", tokenType: "action_token", scope: "per_player", order: "unordered", visibility: "private" },
          ],
        },
      });
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      // No tweak possible, returns unchanged
      assert.equal(mutated.definition.turn.tokenType, "action_token");
      assert.equal(mutated.definition.turn.zone, "hand");
    });
  });

  describe("round_robin", () => {
    it("returns unchanged genome (no-op)", () => {
      const definition = makeRoundRobinDef();
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "round_robin");
      assert.deepStrictEqual(mutated.definition.turn, definition.turn);
    });
  });

  describe("invariants", () => {
    it("does not mutate the input genome", () => {
      const definition = makePriorityQueueDef();
      const genome = { definition };
      const rng = { nextInt: () => 0 };
      const originalDirection = definition.turn.orderBy.direction;

      schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(definition.turn.orderBy.direction, originalDirection);
    });

    it("is deterministic with the same seeded RNG", () => {
      const definition = makePriorityQueueDef();
      const genome1 = { definition: structuredClone(definition) };
      const genome2 = { definition: structuredClone(definition) };
      const makeRng = () => ({ nextInt: () => 0 });

      const result1 = schedulerParamTweakMutation.mutate(genome1, makeRng());
      const result2 = schedulerParamTweakMutation.mutate(genome2, makeRng());

      assert.deepStrictEqual(result1.definition.turn, result2.definition.turn);
    });

    it("preserves scheduler type", () => {
      const definition = makePriorityQueueDef();
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "priority_queue");
    });

    it("has the correct name", () => {
      assert.equal(schedulerParamTweakMutation.name, "scheduler-param-tweak");
    });

    it("returns genome with definition when scheduler is unknown", () => {
      const definition = makePriorityQueueDef();
      definition.turn.scheduler = "some_future_scheduler";
      const genome = { definition };
      const rng = { nextInt: () => 0 };

      const mutated = schedulerParamTweakMutation.mutate(genome, rng);

      assert.equal(mutated.definition.turn.scheduler, "some_future_scheduler");
    });
  });
});
