import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSeededRng } from "../../src/simulation-engine/rng.js";
import {
  numericTweakMutation,
  booleanToggleMutation,
  enumCycleMutation,
  actionDuplicateMutation,
  actionRemoveMutation,
  actionEffectMagnitudeMutation,
  preconditionNegationMutation,
  terminationThresholdMutation,
  terminationOutcomeMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  tokenTypeZoneTargetAddMutation,
  tokenTypeRemoveMutation,
  zoneRemoveMutation,
  effectInsertMutation,
  effectDeleteMutation,
  effectParamTweakMutation,
  effectKindSwapMutation,
  effectReorderMutation,
  actionAddSmallMutation,
  mutateAndRepairGenome,
  defaultMutationOperators,
} from "../../src/evolutionary-engine/mutation.js";
import { dslSafetyRepair, defaultRepairOperators } from "../../src/evolutionary-engine/repair.js";
import { validateGenomeDefinition } from "../../src/evolutionary-engine/serialization.js";
import { createMutationSelector } from "../../src/evolution-runner/operator-setup.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

const ALL_OPERATORS = [
  numericTweakMutation,
  booleanToggleMutation,
  enumCycleMutation,
  actionDuplicateMutation,
  actionRemoveMutation,
  actionEffectMagnitudeMutation,
  preconditionNegationMutation,
  terminationThresholdMutation,
  terminationOutcomeMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  tokenTypeZoneTargetAddMutation,
  tokenTypeRemoveMutation,
  zoneRemoveMutation,
  effectInsertMutation,
  effectDeleteMutation,
  effectParamTweakMutation,
  effectKindSwapMutation,
  effectReorderMutation,
  actionAddSmallMutation,
];

// Multiple fixtures to cover different operator targets.
// boolean-vars-game: has bool variables (for booleanToggleMutation)
// enum-vars-game: has enum variables (for enumCycleMutation)
// multi-token-game: has 2 token types (for tokenTypeRemoveMutation)
const FIXTURE_NAMES = [
  "choice-game.json",
  "evo-seed-1.json",
  "evo-seed-2.json",
  "multi-phase-game.json",
  "token-movement-game.json",
  "per-player-vars-game.json",
  "boolean-vars-game.json",
  "enum-vars-game.json",
  "multi-token-game.json",
];

const MAX_SEEDS = 50;

function repairGenome(genome, rng) {
  const repaired = dslSafetyRepair.repair(genome, rng);
  return repaired ?? genome;
}

describe("mutation-operator-effectiveness", () => {
  describe("each operator produces valid and different output", () => {
    for (const operator of ALL_OPERATORS) {
      it(`${operator.name} produces at least one valid + different genome across fixtures`, async () => {
        const definitions = await Promise.all(
          FIXTURE_NAMES.map((name) => loadFixture(name))
        );

        let validDifferentCount = 0;

        for (const definition of definitions) {
          const genome = { id: "test-genome", definition };
          const originalJson = JSON.stringify(definition);

          for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
            const rng = createSeededRng(seed);
            const mutated = operator.mutate(structuredClone(genome), rng);

            if (!mutated) {
              continue;
            }

            const repaired = repairGenome(mutated, createSeededRng(seed + 1000));
            const validation = validateGenomeDefinition(repaired.definition);

            if (!validation.valid) {
              continue;
            }

            const mutatedJson = JSON.stringify(repaired.definition);
            if (mutatedJson !== originalJson) {
              validDifferentCount += 1;
              break;
            }
          }

          if (validDifferentCount > 0) {
            break;
          }
        }

        assert.ok(
          validDifferentCount >= 1,
          `${operator.name} should produce at least 1 valid + different genome across ${FIXTURE_NAMES.length} fixtures x ${MAX_SEEDS} seeds`
        );
      });
    }
  });

  describe("add operators increase array lengths", () => {
    it("actionDuplicate increases action count", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = { id: "test", definition };
      const originalCount = definition.actions.length;

      for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
        const rng = createSeededRng(seed);
        const mutated = actionDuplicateMutation.mutate(structuredClone(genome), rng);
        if (mutated) {
          const repaired = repairGenome(mutated, rng);
          if (validateGenomeDefinition(repaired.definition).valid) {
            assert.ok(
              repaired.definition.actions.length > originalCount,
              `actionDuplicate should increase action count from ${originalCount}`
            );
            return;
          }
        }
      }
      assert.fail("actionDuplicate never produced a valid genome with more actions");
    });

    it("actionAddSmall increases action count", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = { id: "test", definition };
      const originalCount = definition.actions.length;

      for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
        const rng = createSeededRng(seed);
        const mutated = actionAddSmallMutation.mutate(structuredClone(genome), rng);
        if (mutated) {
          const repaired = repairGenome(mutated, rng);
          if (validateGenomeDefinition(repaired.definition).valid) {
            assert.ok(
              repaired.definition.actions.length > originalCount,
              `actionAddSmall should increase action count from ${originalCount}`
            );
            return;
          }
        }
      }
      assert.fail("actionAddSmall never produced a valid genome with more actions");
    });

    it("effectInsert increases effect count on at least one action", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = { id: "test", definition };
      const originalEffectCounts = definition.actions.map(
        (a) => (a.effects || []).length
      );

      for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
        const rng = createSeededRng(seed);
        const mutated = effectInsertMutation.mutate(structuredClone(genome), rng);
        if (mutated) {
          const repaired = repairGenome(mutated, rng);
          if (validateGenomeDefinition(repaired.definition).valid) {
            const newEffectCounts = repaired.definition.actions.map(
              (a) => (a.effects || []).length
            );
            const anyIncreased = newEffectCounts.some(
              (count, i) => count > originalEffectCounts[i]
            );
            if (anyIncreased) {
              return;
            }
          }
        }
      }
      assert.fail("effectInsert never increased effect count");
    });
  });

  describe("remove operators decrease array lengths", () => {
    it("actionRemove decreases action count", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = { id: "test", definition };
      const originalCount = definition.actions.length;

      for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
        const rng = createSeededRng(seed);
        const mutated = actionRemoveMutation.mutate(structuredClone(genome), rng);
        if (mutated) {
          const repaired = repairGenome(mutated, rng);
          if (validateGenomeDefinition(repaired.definition).valid) {
            assert.ok(
              repaired.definition.actions.length < originalCount,
              `actionRemove should decrease action count from ${originalCount}`
            );
            return;
          }
        }
      }
      assert.fail("actionRemove never produced a valid genome with fewer actions");
    });

    it("effectDelete decreases effect count on at least one action", async () => {
      // token-movement-game has an action with 2 effects, so effectDelete can reduce it
      const definition = await loadFixture("token-movement-game.json");
      const genome = { id: "test", definition };
      const originalEffectCounts = definition.actions.map(
        (a) => (a.effects || []).length
      );

      for (let seed = 0; seed < MAX_SEEDS; seed += 1) {
        const rng = createSeededRng(seed);
        const mutated = effectDeleteMutation.mutate(structuredClone(genome), rng);
        if (mutated) {
          const repaired = repairGenome(mutated, rng);
          if (validateGenomeDefinition(repaired.definition).valid) {
            const newEffectCounts = repaired.definition.actions.map(
              (a) => (a.effects || []).length
            );
            const anyDecreased = newEffectCounts.some(
              (count, i) => count < originalEffectCounts[i]
            );
            if (anyDecreased) {
              return;
            }
          }
        }
      }
      assert.fail("effectDelete never decreased effect count");
    });
  });

  describe("repair restores validity after each operator", () => {
    it("mutateAndRepairGenome produces mostly valid output across 50 iterations", async () => {
      const definitions = await Promise.all(
        FIXTURE_NAMES.map((name) => loadFixture(name))
      );
      const selector = createMutationSelector(defaultMutationOperators);

      let validCount = 0;
      let nullCount = 0;
      let invalidCount = 0;

      for (let seed = 0; seed < 50; seed += 1) {
        const rng = createSeededRng(seed);
        const defIndex = rng.nextInt(definitions.length);
        const genome = {
          id: `iter-${seed}`,
          definition: structuredClone(definitions[defIndex]),
        };

        const result = mutateAndRepairGenome(genome, {
          operators: defaultMutationOperators,
          rng,
          repairOperators: defaultRepairOperators,
          selector,
        });

        if (!result.genome) {
          nullCount += 1;
          continue;
        }

        const validation = validateGenomeDefinition(result.genome.definition);
        if (validation.valid) {
          validCount += 1;
        } else {
          invalidCount += 1;
        }
      }

      const totalNonNull = validCount + invalidCount;
      // Repair should produce valid output most of the time (>=80% of non-null results).
      // Some operators (actionAddSmall, effectInsert) can introduce semantic issues
      // (zone-unknown, free-lunch) that the structural repair doesn't fix.
      assert.ok(
        totalNonNull > 0,
        "mutateAndRepairGenome should produce at least some non-null results"
      );
      const validRatio = validCount / totalNonNull;
      assert.ok(
        validRatio >= 0.8,
        `expected >=80% valid among non-null results, got ${validCount}/${totalNonNull} (${(validRatio * 100).toFixed(0)}%)`
      );
    });
  });
});
