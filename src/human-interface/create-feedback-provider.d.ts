import type { HumanIO } from "./prompt.js";
import type { PreferenceModelState } from "../evaluation-analytics/types.js";
import type { FeedbackRecord, PreferenceModelSnapshotRecord } from "../data-persistence/types.js";
import type { GenerationContext } from "../evolution-runner/runner.js";

export interface FeedbackProviderConfig {
  mode?: "comparison" | "rating";
  maxSamplesPerGen?: number;
  activeLearning?: {
    uncertaintyThreshold?: number;
    diversityQuota?: number;
  };
}

export interface FeedbackProviderOptions {
  io: HumanIO;
  config: FeedbackProviderConfig;
  initialModelState?: PreferenceModelState;
  seed?: number;
}

export interface FeedbackProviderResult {
  feedbackProvider: (context: GenerationContext) => Promise<FeedbackRecord[]>;
  snapshotProvider: (context: GenerationContext) => PreferenceModelSnapshotRecord[];
}

export function createFeedbackProvider(options: FeedbackProviderOptions): FeedbackProviderResult;
