import type {
  ActiveLearningCandidate,
  ActiveLearningPair,
  ActiveLearningSelectionOptions,
  PreferenceModelState,
} from "./types.js";

export function selectActiveLearningPairs(
  candidates: ReadonlyArray<ActiveLearningCandidate>,
  modelState: PreferenceModelState,
  options?: ActiveLearningSelectionOptions
): ReadonlyArray<ActiveLearningPair>;
