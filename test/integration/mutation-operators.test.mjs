import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  actionDuplicateMutation,
  actionEffectMagnitudeMutation,
  actionRemoveMutation,
  booleanToggleMutation,
  enumCycleMutation,
  numericTweakMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  preconditionNegationMutation,
  tokenTypeRemoveMutation,
  tokenTypeZoneTargetAddMutation,
  terminationOutcomeMutation,
  terminationThresholdMutation,
  zoneRemoveMutation,
} from "../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "./helpers/seeded-rng.mjs";
import {
  genomeActionsDefinition,
  genomeBasicDefinition,
  genomePhasesDefinition,
  genomeZonesDefinition,
} from "./fixtures/index.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function countChangedInitials(before, after) {
  let changes = 0;
  for (let index = 0; index < before.length; index += 1) {
    if (before[index] !== after[index]) {
      changes += 1;
    }
  }
  return changes;
}

describe("mutation-operators", () => {
  describe("numericTweakMutation", () => {
    it("tweaks a single int initial deterministically", () => {
      const beforeDefinition = cloneDefinition(genomeBasicDefinition);
      const genome = { definition: beforeDefinition };
      const first = numericTweakMutation.mutate(genome, createSeededRng(12));
      const second = numericTweakMutation.mutate(
        { definition: cloneDefinition(genomeBasicDefinition) },
        createSeededRng(12)
      );

      const beforeInitials = beforeDefinition.state.variables.map((variable) => variable.initial);
      const firstInitials = first.definition.state.variables.map((variable) => variable.initial);
      const secondInitials = second.definition.state.variables.map((variable) => variable.initial);

      assert.deepEqual(firstInitials, secondInitials);
      assert.equal(countChangedInitials(beforeInitials, firstInitials), 1);
    });
  });

  describe("booleanToggleMutation", () => {
    it("flips a bool initial", () => {
      const definition = {
        state: {
          variables: [
            {
              id: "flag",
              scope: "global",
              type: { kind: "bool" },
              initial: true,
            },
          ],
        },
      };

      const mutated = booleanToggleMutation.mutate({ definition }, createSeededRng(1));
      assert.equal(mutated.definition.state.variables[0].initial, false);
    });
  });

  describe("actionDuplicateMutation", () => {
    it("clones an action with a unique id after the target", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      const mutated = actionDuplicateMutation.mutate({ definition }, createSeededRng(8));

      const beforeActions = definition.actions;
      const afterActions = mutated.definition.actions;

      assert.equal(afterActions.length, beforeActions.length + 1);
      assert.equal(afterActions[0].id, beforeActions[0].id);
      assert.notEqual(afterActions[1].id, beforeActions[0].id);
      assert.equal(new Set(afterActions.map((action) => action.id)).size, afterActions.length);
    });
  });

  describe("actionRemoveMutation", () => {
    it("is a no-op when only one action exists", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      const mutated = actionRemoveMutation.mutate({ definition }, createSeededRng(9));

      assert.equal(mutated.definition.actions.length, definition.actions.length);
      assert.deepEqual(mutated.definition.actions, definition.actions);
    });

    it("removes an action when multiple exist", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      definition.actions.push({ id: "skip", actor: "player", effects: [] });

      const mutated = actionRemoveMutation.mutate({ definition }, createSeededRng(10));
      const remainingIds = mutated.definition.actions.map((action) => action.id);

      assert.equal(mutated.definition.actions.length, 1);
      assert.ok(remainingIds.includes("wait") || remainingIds.includes("skip"));
    });
  });

  describe("actionEffectMagnitudeMutation", () => {
    it("tweaks an effect amount", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      const mutated = actionEffectMagnitudeMutation.mutate({ definition }, createSeededRng(11));

      const nextAmount = mutated.definition.actions[0].effects[0].amount;
      assert.equal(nextAmount, 1);
      assert.ok(nextAmount >= 0);
    });
  });

  describe("enumCycleMutation", () => {
    it("picks a different enum value deterministically", () => {
      const beforeDefinition = cloneDefinition(genomeBasicDefinition);
      const originalValue = beforeDefinition.state.tokenTypes[0].attributes[0].initial;

      const first = enumCycleMutation.mutate(
        { definition: beforeDefinition },
        createSeededRng(7)
      );
      const second = enumCycleMutation.mutate(
        { definition: cloneDefinition(genomeBasicDefinition) },
        createSeededRng(7)
      );

      const firstValue = first.definition.state.tokenTypes[0].attributes[0].initial;
      const secondValue = second.definition.state.tokenTypes[0].attributes[0].initial;

      assert.notEqual(firstValue, originalValue);
      assert.equal(firstValue, secondValue);
      assert.ok(["a", "b", "c"].includes(firstValue));
    });
  });

  describe("tokenTypeZoneTargetAddMutation", () => {
    it("adds a token type, zone, and target", () => {
      const definition = cloneDefinition(genomeActionsDefinition);
      const mutated = tokenTypeZoneTargetAddMutation.mutate({ definition }, createSeededRng(12));

      const beforeTokenTypeIds = new Set(definition.state.tokenTypes.map((tokenType) => tokenType.id));
      const beforeZoneIds = new Set(definition.state.zones.map((zone) => zone.id));

      const afterTokenTypes = mutated.definition.state.tokenTypes;
      const afterZones = mutated.definition.state.zones;
      const afterParams = mutated.definition.actions[0].params;

      assert.equal(afterTokenTypes.length, definition.state.tokenTypes.length + 1);
      assert.equal(afterZones.length, definition.state.zones.length + 1);
      assert.equal(afterParams.length, definition.actions[0].params.length + 1);

      const newTokenType = afterTokenTypes[afterTokenTypes.length - 1];
      const newZone = afterZones[afterZones.length - 1];
      const newParam = afterParams[afterParams.length - 1];

      assert.ok(!beforeTokenTypeIds.has(newTokenType.id));
      assert.ok(!beforeZoneIds.has(newZone.id));
      assert.equal(newZone.tokenType, newTokenType.id);
      assert.equal(newParam.domain.selector.zone, newZone.id);
      assert.equal(newParam.domain.selector.tokenType, newTokenType.id);
    });
  });

  describe("tokenTypeRemoveMutation", () => {
    it("removes a token type and rebinds references", () => {
      const definition = cloneDefinition(genomeZonesDefinition);
      const mutated = tokenTypeRemoveMutation.mutate({ definition }, createSeededRng(13));

      const remainingTokenTypes = mutated.definition.state.tokenTypes;
      assert.equal(remainingTokenTypes.length, 1);

      const remainingId = remainingTokenTypes[0].id;
      const removedId = definition.state.tokenTypes.find((tokenType) => tokenType.id !== remainingId)?.id;

      assert.ok(remainingId);
      assert.ok(removedId);
      assert.ok(mutated.definition.state.zones.every((zone) => zone.tokenType === remainingId));
      assert.equal(mutated.definition.actions[0].params[0].domain.selector.tokenType, remainingId);
      assert.equal(mutated.definition.actions[0].effects[0].target.id, remainingId);
      assert.ok(!mutated.definition.state.zones.some((zone) => zone.tokenType === removedId));
    });
  });

  describe("preconditionNegationMutation", () => {
    it("wraps action preconditions", () => {
      const definition = {
        actions: [
          {
            id: "act",
            actor: "player",
            preconditions: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 1 },
            },
          },
        ],
      };

      const mutated = preconditionNegationMutation.mutate({ definition }, createSeededRng(2));
      assert.equal(mutated.definition.actions[0].preconditions.kind, "not");
      assert.deepEqual(
        mutated.definition.actions[0].preconditions.value,
        definition.actions[0].preconditions
      );
    });
  });

  describe("zoneRemoveMutation", () => {
    it("removes a zone and rebinds references", () => {
      const definition = cloneDefinition(genomeZonesDefinition);
      const mutated = zoneRemoveMutation.mutate({ definition }, createSeededRng(14));

      const remainingZones = mutated.definition.state.zones;
      assert.equal(remainingZones.length, 1);

      const remainingId = remainingZones[0].id;
      const removedId = definition.state.zones.find((zone) => zone.id !== remainingId)?.id;

      assert.ok(remainingId);
      assert.ok(removedId);
      assert.equal(mutated.definition.actions[0].params[0].domain.selector.zone, remainingId);
      assert.equal(mutated.definition.actions[0].effects[0].toZone, remainingId);
      assert.ok(!mutated.definition.state.zones.some((zone) => zone.id === removedId));
    });
  });

  describe("terminationThresholdMutation", () => {
    it("tweaks threshold within int bounds", () => {
      const beforeDefinition = cloneDefinition(genomeBasicDefinition);
      const mutated = terminationThresholdMutation.mutate(
        { definition: beforeDefinition },
        createSeededRng(3)
      );

      const nextValue = mutated.definition.termination.conditions[0].condition.right.value;
      assert.equal(nextValue, 9);
      assert.ok(nextValue >= 0);
      assert.ok(nextValue <= 10);
    });
  });

  describe("terminationOutcomeMutation", () => {
    it("changes outcome type deterministically", () => {
      const beforeDefinition = cloneDefinition(genomeBasicDefinition);
      const first = terminationOutcomeMutation.mutate(
        { definition: beforeDefinition },
        createSeededRng(4)
      );
      const second = terminationOutcomeMutation.mutate(
        { definition: cloneDefinition(genomeBasicDefinition) },
        createSeededRng(4)
      );

      const firstType = first.definition.termination.conditions[0].outcome.type;
      const secondType = second.definition.termination.conditions[0].outcome.type;

      assert.notEqual(firstType, "win");
      assert.equal(firstType, secondType);
      assert.ok(["win", "lose", "draw"].includes(firstType));
    });
  });

  describe("phaseAddMutation", () => {
    it("adds a unique phase", () => {
      const definition = cloneDefinition(genomePhasesDefinition);
      const mutated = phaseAddMutation.mutate({ definition }, createSeededRng(5));

      const beforePhases = definition.turn.phases;
      const afterPhases = mutated.definition.turn.phases;
      assert.equal(afterPhases.length, beforePhases.length + 1);
      assert.ok(afterPhases.every((phase) => typeof phase === "string"));
      assert.ok(afterPhases.includes(beforePhases[0]));
    });
  });

  describe("phaseRemoveMutation", () => {
    it("removes a phase but keeps at least one", () => {
      const definition = cloneDefinition(genomePhasesDefinition);
      const mutated = phaseRemoveMutation.mutate({ definition }, createSeededRng(6));

      const beforePhases = definition.turn.phases;
      const afterPhases = mutated.definition.turn.phases;
      assert.equal(afterPhases.length, beforePhases.length - 1);
      assert.ok(afterPhases.length >= 1);
      assert.ok(afterPhases.every((phase) => beforePhases.includes(phase)));
    });
  });
});
