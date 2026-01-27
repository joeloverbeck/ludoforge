import { createSeededRng } from "../../../src/simulation-engine/rng.js";
import { assemblePreferenceFeedbackComparison } from "../../../src/human-interface/feedback.js";
import { stableStringify } from "../../../src/data-persistence/jsonl.js";

const DEFAULT_RATING_MIN = 1;
const DEFAULT_RATING_MAX = 5;

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function assertCandidate(candidate, label) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error(`${label} must be an object with id and featureVector.`);
  }
  if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
    throw new Error(`${label} must include a non-empty string id.`);
  }
  if (!candidate.featureVector || typeof candidate.featureVector !== "object") {
    throw new Error(`${label} must include a featureVector object.`);
  }
}

function normalizeSeed(seed) {
  createSeededRng(seed);
  return seed >>> 0;
}

function buildCandidateFingerprint(candidate) {
  return `${candidate.id}|${stableStringify(candidate.featureVector)}`;
}

function scoreCandidate(seed, candidate) {
  const fingerprint = buildCandidateFingerprint(candidate);
  return hashString(`${seed}|${fingerprint}`);
}

function mapScoreToRating(score, min, max) {
  const range = max - min + 1;
  return min + (score % range);
}

export function createMockHumanEval({ seed = 0, ratingMin, ratingMax } = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const min = Number.isInteger(ratingMin) ? ratingMin : DEFAULT_RATING_MIN;
  const max = Number.isInteger(ratingMax) ? ratingMax : DEFAULT_RATING_MAX;
  if (min > max) {
    throw new Error("ratingMin must be less than or equal to ratingMax.");
  }

  function rateCandidate(candidate) {
    assertCandidate(candidate, "Candidate");
    const score = scoreCandidate(normalizedSeed, candidate);
    const rating = mapScoreToRating(score, min, max);
    return {
      candidateId: candidate.id,
      feedback: {
        type: "rating",
        rating,
        featureVector: candidate.featureVector,
      },
    };
  }

  function compareCandidates(candidateA, candidateB) {
    assertCandidate(candidateA, "Candidate A");
    assertCandidate(candidateB, "Candidate B");

    const scoreA = scoreCandidate(normalizedSeed, candidateA);
    const scoreB = scoreCandidate(normalizedSeed, candidateB);
    const preferred = scoreA === scoreB ? "tie" : scoreA > scoreB ? "a" : "b";

    return assemblePreferenceFeedbackComparison({
      candidateA,
      candidateB,
      prompt: { type: "comparison", preferred },
    });
  }

  return { rateCandidate, compareCandidates };
}
