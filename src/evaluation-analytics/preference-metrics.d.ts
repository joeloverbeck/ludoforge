import type {
  PreferenceFeedbackComparison,
  PreferenceModelState,
  PreferenceMetrics,
} from "./types.js";

export interface PreferenceMetricsOptions {
  bucketSize?: number;
}

export function computePreferenceMetrics(
  state: PreferenceModelState,
  samples: ReadonlyArray<PreferenceFeedbackComparison>,
  options?: PreferenceMetricsOptions
): PreferenceMetrics;
