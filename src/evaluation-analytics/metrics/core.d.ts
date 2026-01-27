import type { MetricResults, TrajectorySummary } from "../types.js";

export function computeAgency(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeStrategicDepth(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeSkillExpression(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeVariety(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computePacingTension(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeInteractionRate(summaries: ReadonlyArray<TrajectorySummary>): number;
export function computeCoreMetrics(summaries: ReadonlyArray<TrajectorySummary>): MetricResults;
