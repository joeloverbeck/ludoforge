const DEFAULT_LEARNING_RATE = 0.05;
const DEFAULT_MAX_HISTORY = 100;

function cloneFeatureVector(vector) {
  return vector && typeof vector === "object" ? { ...vector } : {};
}

function scaleFeatureVector(vector, scalar) {
  const result = {};
  for (const [key, value] of Object.entries(vector ?? {})) {
    result[key] = (Number.isFinite(value) ? value : 0) * scalar;
  }
  return result;
}

function addFeatureVectors(base, delta) {
  const result = { ...base };
  for (const [key, value] of Object.entries(delta ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current + (Number.isFinite(value) ? value : 0);
  }
  return result;
}

function diffFeatureVectors(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current - (Number.isFinite(value) ? value : 0);
  }
  return result;
}

function clampHistory(history, maxHistory) {
  if (maxHistory <= 0) {
    return [];
  }
  if (history.length <= maxHistory) {
    return history;
  }
  return history.slice(history.length - maxHistory);
}

function normalizePreference(preferred) {
  if (preferred === "a") {
    return 1;
  }
  if (preferred === "b") {
    return -1;
  }
  return 0;
}

function safeLearningRate(value) {
  return Number.isFinite(value) ? value : DEFAULT_LEARNING_RATE;
}

function createPreferenceModelState(options = {}) {
  const learningRate = safeLearningRate(options.learningRate);
  const maxHistory = Number.isFinite(options.maxHistory) ? options.maxHistory : DEFAULT_MAX_HISTORY;
  const history = clampHistory(options.history ? [...options.history] : [], maxHistory);
  return {
    version: Number.isFinite(options.version) ? options.version : 1,
    weights: cloneFeatureVector(options.weights),
    bias: Number.isFinite(options.bias) ? options.bias : 0,
    sampleCount: Number.isFinite(options.sampleCount) ? options.sampleCount : 0,
    history,
    learningRate,
    maxHistory,
  };
}

function updatePreferenceModelState(state, feedback, options = {}) {
  const learningRate = safeLearningRate(options.learningRate ?? state.learningRate);
  const maxHistory = Number.isFinite(options.maxHistory) ? options.maxHistory : state.maxHistory;
  const baseWeights = cloneFeatureVector(state.weights);
  const baseBias = Number.isFinite(state.bias) ? state.bias : 0;
  const baseSampleCount = Number.isFinite(state.sampleCount) ? state.sampleCount : 0;
  let weightDelta = {};
  let biasDelta = 0;

  if (feedback?.type === "comparison") {
    const preference = normalizePreference(feedback.preferred);
    const diff = diffFeatureVectors(feedback.featureA, feedback.featureB);
    weightDelta = scaleFeatureVector(diff, learningRate * preference);
    biasDelta = learningRate * preference;
  } else if (feedback?.type === "rating") {
    const rating = Number.isFinite(feedback.rating) ? feedback.rating : 0;
    weightDelta = scaleFeatureVector(feedback.featureVector, learningRate * rating);
    biasDelta = learningRate * rating;
  }

  const nextHistory = clampHistory([...(state.history ?? []), feedback], maxHistory);

  return {
    version: state.version + 1,
    weights: addFeatureVectors(baseWeights, weightDelta),
    bias: baseBias + biasDelta,
    sampleCount: baseSampleCount + 1,
    history: nextHistory,
    learningRate,
    maxHistory,
  };
}

export { createPreferenceModelState, updatePreferenceModelState };
