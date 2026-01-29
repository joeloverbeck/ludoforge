import type { DegeneracyFlag, DegeneracyReport, FeatureVector, MetricResults } from "./types.js";

export interface FeatureVectorOptions {
  metricOrder?: ReadonlyArray<string>;
  includeDegeneracy?: boolean;
  degeneracyOrder?: ReadonlyArray<DegeneracyFlag>;
  degeneracyPrefix?: string;
}

export interface FeatureVectorResult {
  vector: FeatureVector;
  nonFiniteKeys: ReadonlyArray<string>;
}

export const DEFAULT_FEATURE_ORDER: ReadonlyArray<string>;
export const DEFAULT_DEGENERACY_ORDER: ReadonlyArray<DegeneracyFlag>;

export function assembleFeatureVector(
  metrics: MetricResults,
  degeneracy: DegeneracyReport,
  options?: FeatureVectorOptions
): FeatureVectorResult;
