import type { DegeneracyFilterDecision, DegeneracyFilterOptions } from "../evaluation-analytics/degeneracy.js";
import type {
  PreferenceFitnessOptions,
  PreferenceFitnessResult,
} from "../evaluation-analytics/fitness.js";
import type { EvaluationAnalyticsOutput } from "../evaluation-analytics/types.js";
import type { DescriptorSet, EvaluationAdapterOutput, Genome } from "./types.js";

export interface PreferenceEvaluationAnalytics<TDescriptors = DescriptorSet>
  extends EvaluationAnalyticsOutput {
  descriptors: TDescriptors;
}

export interface PreferenceEvaluatorOptions
  extends Omit<PreferenceFitnessOptions, "compositeScore"> {
  degeneracyFilters?: DegeneracyFilterOptions;
}

export interface PreferenceEvaluatorDiagnostics<
  TAnalytics extends EvaluationAnalyticsOutput = EvaluationAnalyticsOutput
> {
  analytics: TAnalytics;
  degeneracy: DegeneracyFilterDecision;
  preferenceFitness: PreferenceFitnessResult;
}

export function createPreferenceEvaluator<
  TGenome = Genome,
  TDescriptors = DescriptorSet,
  TAnalytics extends PreferenceEvaluationAnalytics<TDescriptors> = PreferenceEvaluationAnalytics<TDescriptors>
>(
  computeAnalytics: (genome: TGenome) => TAnalytics,
  options?: PreferenceEvaluatorOptions
): (
  genome: TGenome
) => EvaluationAdapterOutput<number, TDescriptors> & {
  diagnostics: PreferenceEvaluatorDiagnostics<TAnalytics>;
};
