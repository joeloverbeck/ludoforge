const DEFAULT_MAX_PAIRS = 5;
const DEFAULT_UNCERTAINTY_THRESHOLD = 0.15;
const DEFAULT_DIVERSITY_QUOTA = 1;
const DEFAULT_CADENCE = 1;

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
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

function linearScore(state, featureVector) {
  return dotProduct(state?.weights, featureVector) + safeNumber(state?.bias);
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
    return a.uncertainty - b.uncertainty;
  }
  if (a.idA !== b.idA) {
    return a.idA < b.idA ? -1 : 1;
  }
  if (a.idB !== b.idB) {
    return a.idB < b.idB ? -1 : 1;
  }
  return 0;
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
    linear: linearScore(modelState, candidate?.featureVector),
  }));

  const pairs = [];
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = i + 1; j < scored.length; j += 1) {
      const left = scored[i];
      const right = scored[j];
      const winProbability = sigmoid(left.linear - right.linear);
      const uncertainty = Math.abs(winProbability - 0.5);
      pairs.push({
        candidateA: left.candidate,
        candidateB: right.candidate,
        idA: left.id,
        idB: right.id,
        nicheA: left.nicheId,
        nicheB: right.nicheId,
        key: pairKey(left.id, right.id),
        winProbability,
        uncertainty,
      });
    }
  }

  pairs.sort(comparePairs);

  const uncertainPairs = Number.isFinite(options.uncertaintyThreshold)
    ? pairs.filter((pair) => pair.uncertainty <= uncertaintyThreshold)
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
