import type { DegeneracyFlag, DegeneracyReport, TrajectorySummary } from "./types.js";

export interface DegeneracyThresholds {
  loopRepeatRatio?: number;
  minRepeatedStates?: number;
  forcedMoveRatio?: number;
  dominantActionRatio?: number;
  minActionSamples?: number;
  trivialWinRate?: number;
  trivialWinMaxAverageSteps?: number;
  minTrivialWinSamples?: number;
}

export interface DegeneracyFilterOptions {
  rejectFlags?: ReadonlyArray<DegeneracyFlag>;
}

export interface DegeneracyFilterDecision {
  allow: boolean;
  rejectedFlags: DegeneracyFlag[];
}

export const DEFAULT_DEGENERACY_THRESHOLDS: Readonly<Required<DegeneracyThresholds>>;
export const DEFAULT_DEGENERACY_FILTERS: Readonly<{ rejectFlags: ReadonlyArray<DegeneracyFlag> }>;

export function detectDegeneracy(
  summaries: ReadonlyArray<TrajectorySummary>,
  thresholds?: DegeneracyThresholds
): DegeneracyReport;

export function applyDegeneracyFilters(
  report: DegeneracyReport,
  options?: DegeneracyFilterOptions
): DegeneracyFilterDecision;
