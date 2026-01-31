import type {
  AgentController,
  AgentDescriptor,
  BatchRunOptions,
  BatchMetricsHooks,
  BatchSimulationResult,
  GreedyPolicyOptions,
  RolloutConfig,
  RolloutResult,
  SeededRng,
  SimulationConfig,
  SimulationEngine,
} from "./types.js";

export type {
  AgentController,
  AgentDescriptor,
  BatchHookContext,
  BatchMetricsHooks,
  BatchRunOptions,
  BatchSimulationResult,
  GreedyPolicyOptions,
  LoopDetectionOptions,
  RolloutConfig,
  RolloutResult,
  RolloutTerminationReason,
  SeededRng,
  SimulationConfig,
  SimulationEngine,
  SimulationResult,
  SimulationTerminationReason,
  StepControlOptions,
  Trajectory,
  TrajectoryStep,
} from "./types.js";

export function createSimulationEngine(config: SimulationConfig): SimulationEngine;
export function runBatchSimulations(
  inputs: SimulationConfig[],
  hooks?: BatchMetricsHooks,
  options?: BatchRunOptions,
): Promise<BatchSimulationResult>;
export function runRollout(config: RolloutConfig): Promise<RolloutResult>;
export function createSeededRng(seed: number): SeededRng;
export function createRandomPolicy(): AgentController;
export function createGreedyPolicy(options?: GreedyPolicyOptions): AgentController;
