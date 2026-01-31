import type {
  ActionDef,
  GameDefinition,
  ScalarValue,
  TerminationOutcome,
} from "../dsl/types.js";
import type { GameEvent } from "../game-kernel/events.js";
import type { OutcomeType } from "../game-kernel/termination.js";
import type { GameState } from "../game-kernel/state.js";

export type NoLegalActionsPolicy = "terminate" | "pass" | "error" | "stalemate";

export interface SimulationNoLegalActionsOverride {
  policy: NoLegalActionsPolicy;
  reason?: string | null;
  defaultOutcome?: TerminationOutcome;
}

export interface SimulationTurnOverrides {
  noLegalActions?: SimulationNoLegalActionsOverride;
}

export interface SimulationConfigFile {
  version?: number;
  updatedAt?: string;
  maxTurns?: number | null;
  maxSteps?: number | null;
  loopDetection?: {
    enabled?: boolean;
    maxRepeatedStates?: number | null;
  };
  turn?: {
    noLegalActions?: {
      policy?: NoLegalActionsPolicy;
      reason?: string | null;
    };
  };
  rng?: {
    seed?: number | string | null;
    algorithm?: "lcg32";
  };
}

export interface SimulationConfig {
  definition: GameDefinition;
  agents: Array<AgentController | AgentDescriptor>;
  seed?: number;
  rng?: SeededRng;
  maxTurns?: number;
  maxSteps?: number;
  loopDetection?: LoopDetectionOptions;
  stepControl?: StepControlOptions;
  turn?: SimulationTurnOverrides;
  simulationConfig?: SimulationConfigFile;
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
  selectAction(input: AgentInput): ActionDef | string | Promise<ActionDef | string>;
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
  actionId?: string | null;
  legalActionCount?: number;
  affectedPlayerIds: number[];
  affectedGlobal: boolean;
  state: GameState;
}

export interface Trajectory {
  steps: TrajectoryStep[];
  events?: GameEvent[];
}

export interface SimulationOutcome {
  outcomes?: Record<number, OutcomeType>;
  scores?: Record<number, ScalarValue>;
}

export interface SimulationResult {
  trajectory: Trajectory;
  outcome: SimulationOutcome;
  terminationReason: SimulationTerminationReason;
  terminated: boolean;
  terminationDetail?: string;
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
  turn?: SimulationTurnOverrides;
  simulationConfig?: SimulationConfigFile;
}

export interface RolloutResult {
  trajectory: Trajectory;
  outcome: SimulationOutcome;
  terminationReason: RolloutTerminationReason;
  terminated: boolean;
  terminationDetail?: string;
  metrics?: Record<string, number>;
}

export interface SimulationEngine {
  run(): Promise<SimulationResult>;
  runBatch(count: number): Promise<SimulationResult[]>;
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
  | "max-steps"
  | "loop-detected"
  | "stalemate"
  | "no-legal-actions"
  | "trigger-loop"
  | "trigger-recursion"
  | "scheduler-error";

export type RolloutTerminationReason = SimulationTerminationReason | "max-steps";
