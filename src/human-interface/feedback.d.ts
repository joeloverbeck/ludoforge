import type { HumanIO } from "./prompt.js";
import type { FeatureVector, PreferenceFeedbackComparison } from "../evaluation-analytics/types.js";

export interface FeedbackPromptInput {
  io: HumanIO;
  promptLabel?: string;
  tagsLabel?: string;
  rationaleLabel?: string;
}

export interface RatingFeedbackRecord {
  type: "rating";
  rating: number;
  tags?: ReadonlyArray<string>;
  rationale?: string;
}

export interface ComparisonFeedbackRecord {
  type: "comparison";
  preferred: "a" | "b" | "tie";
  tags?: ReadonlyArray<string>;
  rationale?: string;
}

export type FeedbackRecord = RatingFeedbackRecord | ComparisonFeedbackRecord;

export interface ComparisonFeedbackPromptResult {
  type: "comparison";
  preferred: "a" | "b" | "tie";
  tags?: ReadonlyArray<string>;
  rationale?: string;
}

export interface PreferenceFeedbackCandidate {
  id?: string;
  featureVector: FeatureVector;
}

export interface PreferenceFeedbackAssemblyInput {
  candidateA: PreferenceFeedbackCandidate;
  candidateB: PreferenceFeedbackCandidate;
  prompt: ComparisonFeedbackPromptResult;
}

export function promptForRating(input: FeedbackPromptInput): Promise<RatingFeedbackRecord>;
export function promptForPairwiseComparison(
  input: FeedbackPromptInput,
): Promise<ComparisonFeedbackRecord>;
export function assemblePreferenceFeedbackComparison(
  input: PreferenceFeedbackAssemblyInput,
): PreferenceFeedbackComparison;
