import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  updateAction,
  updateExpr,
  updateTriggers,
} from "../../src/evolutionary-engine/mutation/traversal.js";
import {
  updateRefTokenType,
  updateRefZone,
} from "../../src/evolutionary-engine/mutation/ref-updaters.js";
import { genomeTraversalDefinition } from "./fixtures/index.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function getAttributeSet(definition, tokenTypeId) {
  const tokenType = definition.state.tokenTypes.find((entry) => entry.id === tokenTypeId);
  return new Set((tokenType?.attributes || []).map((attr) => attr.id));
}

describe("mutation-traversal", () => {
  describe("token ref updates", () => {
    it("updates token refs and prunes invalid attributes", () => {
      const definition = cloneDefinition(genomeTraversalDefinition);
      const removedId = "pawn";
      const replacementId = "piece";
      const replacementAttributes = getAttributeSet(definition, replacementId);

      definition.actions.forEach((action) =>
        updateAction(action, {
          onTokenRef: (ref) =>
            updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
          onTokenType: (selector) => {
            if (selector.tokenType === removedId) {
              selector.tokenType = replacementId;
            }
          },
        })
      );

      updateTriggers(definition.triggers, {
        onTokenRef: (ref) =>
          updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
      });
      updateTriggers(definition.turn?.stepEffects, {
        onTokenRef: (ref) =>
          updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
      });

      definition.termination.conditions.forEach((condition) => {
        updateExpr(condition.condition, {
          onTokenRef: (ref) =>
            updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
        });
      });
      updateExpr(definition.termination.scoring.perPlayer, {
        onTokenRef: (ref) =>
          updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
      });

      const action = definition.actions[0];
      assert.equal(action.params[0].domain.selector.tokenType, "piece");
      assert.equal(action.costs[0].target.id, "piece");
      assert.equal(action.costs[0].target.attribute, "owner");

      assert.equal(action.effects[0].target.id, "piece");
      assert.ok(!("attribute" in action.effects[0].target));
      assert.equal(action.preconditions.left.ref.id, "piece");
      assert.ok(!("attribute" in action.preconditions.left.ref));
      assert.equal(action.preconditions.right.ref.id, "board");

      assert.equal(definition.triggers[0].effects[0].target.id, "piece");
      assert.ok(!("attribute" in definition.triggers[0].effects[0].target));
      assert.equal(definition.termination.conditions[0].condition.ref.id, "piece");
      assert.equal(definition.termination.scoring.perPlayer.ref.id, "board");
    });
  });

  describe("zone ref updates", () => {
    it("updates zone refs and toZone fields", () => {
      const definition = cloneDefinition(genomeTraversalDefinition);
      const removedId = "board";
      const replacementId = "bench";

      definition.actions.forEach((action) =>
        updateAction(action, {
          onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
          onZone: (selector) => {
            if (selector.zone === removedId) {
              selector.zone = replacementId;
            }
          },
          onZoneTo: (effect) => {
            if (effect.toZone === removedId) {
              effect.toZone = replacementId;
            }
          },
        })
      );

      updateTriggers(definition.triggers, {
        onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
        onZoneTo: (effect) => {
          if (effect.toZone === removedId) {
            effect.toZone = replacementId;
          }
        },
      });
      updateTriggers(definition.turn?.stepEffects, {
        onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
        onZoneTo: (effect) => {
          if (effect.toZone === removedId) {
            effect.toZone = replacementId;
          }
        },
      });

      definition.termination.conditions.forEach((condition) => {
        updateExpr(condition.condition, {
          onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
        });
      });
      updateExpr(definition.termination.scoring.perPlayer, {
        onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      });

      const action = definition.actions[0];
      assert.equal(action.params[0].domain.selector.zone, "bench");
      assert.equal(action.effects[0].toZone, "bench");
      assert.equal(action.preconditions.right.ref.id, "bench");
      assert.equal(definition.triggers[0].effects[0].toZone, "bench");
      assert.equal(definition.termination.scoring.perPlayer.ref.id, "bench");
      assert.equal(action.preconditions.left.ref.id, "pawn");
    });
  });
});
