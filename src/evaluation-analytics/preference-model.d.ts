import type {
  FeatureVector,
  PreferenceFeedbackSample,
  PreferenceModelState,
} from "./types.js";

export interface PreferenceModelStateOptions {
  version?: number;
  weights?: FeatureVector;
  bias?: number;
  sampleCount?: number;
  history?: ReadonlyArray<PreferenceFeedbackSample>;
  learningRate?: number;
  maxHistory?: number;
}

export interface PreferenceModelUpdateOptions {
  learningRate?: number;
  maxHistory?: number;
}

export function createPreferenceModelState(
  options?: PreferenceModelStateOptions
): PreferenceModelState;

export function updatePreferenceModelState(
  state: PreferenceModelState,
  feedback: PreferenceFeedbackSample,
  options?: PreferenceModelUpdateOptions
): PreferenceModelState;
