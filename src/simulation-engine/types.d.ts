import type { ActionDef, GameDefinition } from "../dsl/types.js";
import type { GameEvent } from "../game-kernel/events.js";
import type { TerminationResult } from "../game-kernel/termination.js";
import type { GameState } from "../game-kernel/state.js";

export interface SimulationConfig {
  definition: GameDefinition;
  agents: Array<AgentController | AgentDescriptor>;
  seed?: number;
  rng?: SeededRng;
  maxTurns?: number;
  loopDetection?: LoopDetectionOptions;
  stepControl?: StepControlOptions;
}

export interface AgentContext {
  playerId?: number;
  phase?: string | null;
  turn: number;
}

export interface AgentInput {
  definition: GameDefinition;
  state: GameState;
  legalActions: ActionDef[];
  context: AgentContext;
  rng?: SeededRng;
}

export interface AgentController {
  id?: number;
  role?: string;
  selectAction(input: AgentInput): ActionDef | string;
}

export interface AgentDescriptor {
  kind: "random" | "greedy";
  id?: number;
  role?: string;
  options?: GreedyPolicyOptions;
}

export interface GreedyScoreInput extends AgentInput {
  action: ActionDef;
}

export interface GreedyPolicyOptions {
  scoreAction?: (input: GreedyScoreInput) => number | null | undefined;
}

export interface TrajectoryStep {
  turn: number;
  phase: string | null;
  playerId: number | null;
  actionId?: string;
  legalActionCount?: number;
  state: GameState;
}

export interface Trajectory {
  steps: TrajectoryStep[];
  events?: GameEvent[];
}

export interface SimulationResult {
  trajectory: Trajectory;
  outcome: TerminationResult;
  terminationReason?: SimulationTerminationReason;
  metrics?: Record<string, number>;
}

export interface RolloutConfig {
  definition: GameDefinition;
  state: GameState;
  agent: AgentController | AgentDescriptor;
  seed?: number;
  rng?: SeededRng;
  maxSteps?: number;
  loopDetection?: LoopDetectionOptions;
}

export interface RolloutResult {
  trajectory: Trajectory;
  outcome: TerminationResult;
  terminationReason?: RolloutTerminationReason;
  metrics?: Record<string, number>;
}

export interface SimulationEngine {
  run(): SimulationResult;
  runBatch(count: number): SimulationResult[];
}

export interface BatchHookContext {
  index: number;
  input: SimulationConfig;
}

export interface BatchMetricsHooks<TMetrics = Record<string, number>> {
  onStep?: (step: TrajectoryStep, context: BatchHookContext) => void;
  onTerminal?: (result: SimulationResult, context: BatchHookContext) => void;
  reduceMetrics?: (metrics: TMetrics, result: SimulationResult, context: BatchHookContext) => TMetrics | void;
  initialMetrics?: TMetrics;
}

export interface BatchSimulationResult<TMetrics = Record<string, number>> {
  results: SimulationResult[];
  metrics?: TMetrics;
}

export interface BatchRunOptions {
  concurrency?: number;
}

export interface SeededRng {
  next(): number;
  nextInt(max: number): number;
}

export interface LoopDetectionOptions {
  maxRepeatedStates?: number;
  stateHasher?: (state: GameState) => string;
}

export interface StepControlOptions {
  onStep?: (step: TrajectoryStep) => void;
  pauseOnStep?: boolean;
}

export type SimulationTerminationReason =
  | "condition"
  | "max-turns"
  | "loop-detected"
  | "stalemate";

export type RolloutTerminationReason = SimulationTerminationReason | "max-steps";
