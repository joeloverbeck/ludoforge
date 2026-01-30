import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runSimulation } from "../../src/simulation-engine/loop.js";
import {
  LOG_ADAPTER_VERSION,
  adaptSimulationLog,
} from "../../src/evaluation-analytics/log-adapter.js";
import { computeCoreMetrics } from "../../src/evaluation-analytics/metrics/core.js";
import { detectDegeneracy } from "../../src/evaluation-analytics/degeneracy.js";
import { assembleFeatureVector } from "../../src/evaluation-analytics/feature-vector.js";
import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../../src/evaluation-analytics/preference-model.js";
import { assemblePreferenceFeedbackComparison } from "../../src/human-interface/feedback.js";

function constantRng(value) {
  return {
    next() {
      return value;
    },
  };
}

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function runSimulations(definition, seeds) {
  return seeds.map((seed) =>
    runSimulation({
      definition,
      agents: [{ kind: "random" }, { kind: "random" }],
      seed,
    })
  );
}

function buildFeatureVector(definition, results) {
  const adapterResult = adaptSimulationLog({
    version: LOG_ADAPTER_VERSION,
    log: {
      definition,
      results,
      metadata: { source: "e2e" },
    },
  });

  if (!adapterResult.ok) {
    throw adapterResult.error;
  }

  const summaries = adapterResult.value.trajectorySummaries;
  const metrics = computeCoreMetrics(summaries);
  const degeneracy = detectDegeneracy(summaries);
  const { vector } = assembleFeatureVector(metrics, degeneracy);
  return vector;
}

describe("preference-model-update", () => {
  it("preference model updates from real feature vectors", async () => {
    const choiceDefinition = await loadFixture("choice-game.json");
    const minimalDefinition = await loadFixture("minimal-game.json");

    const featureVectorA = buildFeatureVector(
      choiceDefinition,
      runSimulations(choiceDefinition, [3, 5, 7])
    );
    const featureVectorB = buildFeatureVector(
      minimalDefinition,
      runSimulations(minimalDefinition, [11, 13, 17])
    );
    const featureVectorARepeat = buildFeatureVector(
      choiceDefinition,
      runSimulations(choiceDefinition, [3, 5, 7])
    );

    const differingKeys = Object.keys(featureVectorA).filter(
      (key) => featureVectorA[key] !== featureVectorB[key]
    );
    assert.ok(differingKeys.length > 0, "Expected distinct feature vectors");

    for (const featureVector of [featureVectorA, featureVectorB]) {
      assert.ok(
        Object.hasOwn(featureVector, "turn_taking_rate"),
        "Expected turn_taking_rate in feature vector"
      );
      assert.ok(
        Object.hasOwn(featureVector, "interaction_rate"),
        "Expected interaction_rate in feature vector"
      );
      assert.equal(
        featureVector.turn_taking_rate,
        1,
        "Expected round-robin fixtures to alternate turns"
      );
      assert.equal(
        featureVector.interaction_rate,
        0,
        "Expected global-only effects to yield zero interaction"
      );
    }

    assert.deepEqual(
      featureVectorARepeat,
      featureVectorA,
      "Expected deterministic metrics for identical seeds"
    );

    const feedback = assemblePreferenceFeedbackComparison({
      candidateA: { id: "candidate-a", featureVector: featureVectorA },
      candidateB: { id: "candidate-b", featureVector: featureVectorB },
      prompt: { preferred: "a" },
    });

    const initialState = createPreferenceModelState({
      weights: {},
      bias: 0,
      sampleCount: 0,
      history: [],
      learningRate: 0.1,
    });

    const updated = updatePreferenceModelState(initialState, feedback, {
      rng: constantRng(0.5),
    });

    assert.equal(updated.sampleCount, initialState.sampleCount + 1);
    assert.equal(updated.version, initialState.version + 1);
    assert.equal(updated.history.length, 1);
    assert.equal(updated.history[0].type, "comparison");

    const totalWeight = updated.models.reduce((total, model) => {
      const modelWeight = Object.values(model.weights ?? {}).reduce(
        (subtotal, value) => subtotal + Math.abs(value),
        0
      );
      return total + modelWeight;
    }, 0);
    assert.ok(totalWeight > 0, "Expected preference weights to update");
  });
});
