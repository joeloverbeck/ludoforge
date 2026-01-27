import type { GameDefinition } from "../../dsl/types.js";
import type { MetricResults, TrajectorySummary } from "../types.js";

export function computeLengthMean(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeLengthVariance(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeEarlyTerminationRate(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeBalanceSkew(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeCoverageActions(
  definition: GameDefinition,
  summaries: ReadonlyArray<TrajectorySummary>
): number;
export function computeCoverageState(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeExtendedMetrics(
  definition: GameDefinition,
  summaries: ReadonlyArray<TrajectorySummary>
): MetricResults;
