import type { GameDefinition } from "../../dsl/types.js";
import type { DecisionQualitySamplingConfig, ExtendedMetricsOptions, MetricResults, TrajectorySummary } from "../types.js";
import type { SimulationResult } from "../../simulation-engine/types.js";

export function computeLengthMean(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeLengthVariance(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeEarlyTerminationRate(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeOutcomeVariance(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeBalanceSkew(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeCoverageActions(
  definition: GameDefinition,
  summaries: ReadonlyArray<TrajectorySummary>
): number;
export function computeCoverageState(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeMeaningfulChoice(
  definition: GameDefinition,
  simulations: ReadonlyArray<SimulationResult>,
  options?: DecisionQualitySamplingConfig
): number;
export function computeComebackPotential(
  definition: GameDefinition,
  simulations: ReadonlyArray<SimulationResult>,
  options?: DecisionQualitySamplingConfig
): number;
export function computeExtendedMetrics(
  definition: GameDefinition,
  summaries: ReadonlyArray<TrajectorySummary>,
  options?: ExtendedMetricsOptions
): MetricResults;
