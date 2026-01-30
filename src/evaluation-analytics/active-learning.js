import { loadConfigFile } from "../config/loader.js";

const FALLBACK_MAX_PAIRS = 5;
const FALLBACK_UNCERTAINTY_THRESHOLD = 0.15;
const FALLBACK_DIVERSITY_QUOTA = 1;
const FALLBACK_CADENCE = 1;

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultActiveLearningConfig() {
  const result = await loadConfigFile({ name: "active-learning" });
  if (!result.valid) {
    throw new Error(
      `Active learning config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_ACTIVE_LEARNING_CONFIG = await loadDefaultActiveLearningConfig();

const DEFAULT_MAX_PAIRS = Number.isFinite(DEFAULT_ACTIVE_LEARNING_CONFIG?.maxPairs)
  ? DEFAULT_ACTIVE_LEARNING_CONFIG.maxPairs
  : FALLBACK_MAX_PAIRS;
const DEFAULT_UNCERTAINTY_THRESHOLD = Number.isFinite(
  DEFAULT_ACTIVE_LEARNING_CONFIG?.uncertaintyThreshold
)
  ? DEFAULT_ACTIVE_LEARNING_CONFIG.uncertaintyThreshold
  : FALLBACK_UNCERTAINTY_THRESHOLD;
const DEFAULT_DIVERSITY_QUOTA = Number.isFinite(DEFAULT_ACTIVE_LEARNING_CONFIG?.diversityQuota)
  ? DEFAULT_ACTIVE_LEARNING_CONFIG.diversityQuota
  : FALLBACK_DIVERSITY_QUOTA;
const DEFAULT_CADENCE = Number.isFinite(DEFAULT_ACTIVE_LEARNING_CONFIG?.cadence)
  ? DEFAULT_ACTIVE_LEARNING_CONFIG.cadence
  : FALLBACK_CADENCE;

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function entropy(probability) {
  const p = clamp01(probability);
  if (p === 0 || p === 1) {
    return 0;
  }
  return -p * Math.log(p) - (1 - p) * Math.log(1 - p);
}

function dotProduct(weights, featureVector) {
  if (!weights || typeof weights !== "object") {
    return 0;
  }
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const featureValue = featureVector && typeof featureVector === "object" ? featureVector[key] : 0;
    total += safeNumber(weight) * safeNumber(featureValue);
  }
  return total;
}

function resolveModels(state) {
  if (Array.isArray(state?.models) && state.models.length > 0) {
    return state.models;
  }
  if (state && typeof state === "object" && ("weights" in state || "bias" in state)) {
    return [state];
  }
  return [];
}

function candidateId(candidate, index) {
  if (candidate && typeof candidate.id === "string" && candidate.id.length > 0) {
    return candidate.id;
  }
  return `idx-${index}`;
}

function pairKey(idA, idB) {
  return idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
}

function comparePairs(a, b) {
  if (a.uncertainty !== b.uncertainty) {
    return b.uncertainty - a.uncertainty;
  }
  if (a.idA !== b.idA) {
    return a.idA < b.idA ? -1 : 1;
  }
  if (a.idB !== b.idB) {
    return a.idB < b.idB ? -1 : 1;
  }
  return 0;
}

function computePairAcquisition(models, featureA, featureB) {
  if (!models.length) {
    return {
      winProbability: 0.5,
      acquisition: 0,
      pVar: 0,
      bald: 0,
    };
  }

  let sum = 0;
  let sumSquares = 0;
  let entropySum = 0;
  for (const model of models) {
    const scoreA = dotProduct(model?.weights, featureA) + safeNumber(model?.bias);
    const scoreB = dotProduct(model?.weights, featureB) + safeNumber(model?.bias);
    const probability = sigmoid(scoreA - scoreB);
    sum += probability;
    sumSquares += probability * probability;
    entropySum += entropy(probability);
  }

  const count = models.length;
  const pMean = sum / count;
  const pVar = Math.max(0, sumSquares / count - pMean * pMean);
  const bald = Math.max(0, entropy(pMean) - entropySum / count);
  const acquisition = models.length > 1 && Number.isFinite(bald) ? bald : pVar;

  return {
    winProbability: pMean,
    acquisition,
    pVar,
    bald,
  };
}

function collectUnderrepresentedNiches(candidates) {
  const counts = new Map();
  for (const candidate of candidates ?? []) {
    if (!candidate?.nicheId) {
      continue;
    }
    const current = counts.get(candidate.nicheId) ?? 0;
    counts.set(candidate.nicheId, current + 1);
  }
  if (!counts.size) {
    return new Set();
  }
  let minCount = Infinity;
  for (const count of counts.values()) {
    if (count < minCount) {
      minCount = count;
    }
  }
  const underrepresented = new Set();
  for (const [nicheId, count] of counts.entries()) {
    if (count === minCount) {
      underrepresented.add(nicheId);
    }
  }
  return underrepresented;
}

function pairHasUnderrepresented(pair, underrepresented) {
  if (!underrepresented.size) {
    return false;
  }
  return (
    underrepresented.has(pair.nicheA) ||
    underrepresented.has(pair.nicheB)
  );
}

function selectActiveLearningPairs(candidates, modelState, options = {}) {
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return [];
  }

  const models = resolveModels(modelState);
  const cadence = safeNumber(options.cadence, DEFAULT_CADENCE);
  const iteration = safeNumber(options.iteration, 0);
  if (cadence > 1 && iteration % cadence !== 0) {
    return [];
  }

  const maxPairs = Math.floor(safeNumber(options.maxPairs, DEFAULT_MAX_PAIRS));
  if (maxPairs <= 0) {
    return [];
  }

  const uncertaintyThreshold = safeNumber(
    options.uncertaintyThreshold,
    DEFAULT_UNCERTAINTY_THRESHOLD
  );
  const diversityQuota = Math.floor(
    safeNumber(options.diversityQuota, DEFAULT_DIVERSITY_QUOTA)
  );
  const underrepresented = collectUnderrepresentedNiches(candidates);

  const scored = candidates.map((candidate, index) => ({
    candidate,
    index,
    id: candidateId(candidate, index),
    nicheId: candidate?.nicheId ?? null,
    featureVector: candidate?.featureVector ?? null,
  }));

  const pairs = [];
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = i + 1; j < scored.length; j += 1) {
      const left = scored[i];
      const right = scored[j];
      const { winProbability, acquisition } = computePairAcquisition(
        models,
        left.featureVector,
        right.featureVector
      );
      pairs.push({
        candidateA: left.candidate,
        candidateB: right.candidate,
        idA: left.id,
        idB: right.id,
        nicheA: left.nicheId,
        nicheB: right.nicheId,
        key: pairKey(left.id, right.id),
        winProbability,
        uncertainty: acquisition,
      });
    }
  }

  pairs.sort(comparePairs);

  const uncertainPairs = Number.isFinite(options.uncertaintyThreshold)
    ? pairs.filter((pair) => pair.uncertainty >= uncertaintyThreshold)
    : pairs;
  const remainderPool = uncertainPairs.length > 0 ? uncertainPairs : pairs;

  const selection = [];
  const selectedKeys = new Set();

  if (diversityQuota > 0 && underrepresented.size > 0) {
    for (const pair of pairs) {
      if (selection.length >= maxPairs || selection.length >= diversityQuota) {
        break;
      }
      if (!pairHasUnderrepresented(pair, underrepresented)) {
        continue;
      }
      if (selectedKeys.has(pair.key)) {
        continue;
      }
      selectedKeys.add(pair.key);
      selection.push(pair);
    }
  }

  for (const pair of remainderPool) {
    if (selection.length >= maxPairs) {
      break;
    }
    if (selectedKeys.has(pair.key)) {
      continue;
    }
    selectedKeys.add(pair.key);
    selection.push(pair);
  }

  return selection.map((pair) => ({
    candidateA: pair.candidateA,
    candidateB: pair.candidateB,
    winProbability: pair.winProbability,
    uncertainty: pair.uncertainty,
  }));
}

export { selectActiveLearningPairs };
