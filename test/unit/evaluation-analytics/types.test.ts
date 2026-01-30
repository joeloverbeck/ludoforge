import type { GameDefinition } from "../../../src/dsl/types.js";
import type { GameState } from "../../../src/game-kernel/state.js";
import type { SimulationResult, TrajectoryStep } from "../../../src/simulation-engine/types.js";
import type {
  CompositeScore,
  DegeneracyReport,
  EvaluationAnalyticsInput,
  EvaluationAnalyticsOutput,
  FeatureVector,
  MetricResults,
  PreferenceCalibrationBucket,
  PreferenceFeedbackSample,
  PreferenceMetrics,
  PreferenceModelState,
  PreferenceModelUpdate,
  PreferenceScore,
  SimulationLog,
  TrajectorySummary,
} from "../../../src/evaluation-analytics/types.js";

const definition: GameDefinition = {
  version: "0.1.0",
  players: { count: 2 },
  state: {
    variables: [
      {
        id: "score",
        scope: "per_player",
        type: { kind: "int", min: 0 },
        initial: 0,
      },
    ],
  },
  actions: [
    {
      id: "pass",
      actor: "player",
      effects: [],
    },
  ],
  turn: { scheduler: "round_robin" },
  termination: {
    conditions: [
      {
        condition: { kind: "value", value: true },
        outcome: { type: "draw", players: "all" },
      },
    ],
  },
};

const state: GameState = {
  variables: {
    global: {},
    perPlayer: {
      1: { score: 0 },
      2: { score: 0 },
    },
  },
  tokens: {},
  zones: {},
  agents: [
    { id: 1, variables: {} },
    { id: 2, variables: {} },
  ],
  turn: { currentPlayer: 1, phase: null, turn: 1, round: 1 },
  nextTokenId: 1,
};

const step: TrajectoryStep = {
  turn: 1,
  phase: null,
  playerId: 1,
  actionId: "pass",
  legalActionCount: 1,
  affectedPlayerIds: [],
  affectedGlobal: false,
  state,
};

const simulationResult: SimulationResult = {
  trajectory: { steps: [step] },
  outcome: {
    outcomes: { 1: "draw", 2: "draw" },
  },
  terminationReason: "condition",
  terminated: true,
};

const log: SimulationLog = {
  definition,
  results: [simulationResult],
  metadata: { candidateId: "candidate-1" },
};

const input: EvaluationAnalyticsInput = {
  definition,
  simulations: [simulationResult],
  logMetadata: log.metadata,
};

const summary: TrajectorySummary = {
  stepCount: 1,
  turnCount: 1,
  terminalOutcome: simulationResult.outcome,
  terminationReason: "condition",
  terminated: true,
  actionCounts: { pass: 1 },
  uniqueStateCount: 1,
  keySteps: [{ turn: 1, phase: null, playerId: 1, actionId: "pass" }],
};

const metrics: MetricResults = [{ id: "agency", value: 0.75 }];

const degeneracy: DegeneracyReport = {
  flags: ["no-choices"],
  details: { "no-choices": true },
};

const featureVector: FeatureVector = { agency: 0.75 };

const compositeScore: CompositeScore = {
  score: 0.75,
  components: featureVector,
};

const preferenceModelUpdate: PreferenceModelUpdate = {
  weights: { agency: 0.1 },
  bias: 0,
  sampleCount: 1,
  learningRate: 0.05,
};

const preferenceScore: PreferenceScore = {
  score: 0.7,
  confidence: 0.4,
  pMean: 0.7,
  pVar: 0.01,
  uncertainty: 0.2,
  bald: 0.05,
};

const preferenceCalibrationBucket: PreferenceCalibrationBucket = {
  lowerBound: 0,
  upperBound: 0.1,
  count: 1,
  averagePredicted: 0.05,
  averageOutcome: 0,
};

const preferenceMetrics: PreferenceMetrics = {
  accuracy: 1,
  correct: 1,
  total: 1,
  ties: 0,
  bucketSize: 0.1,
  calibrationBuckets: [preferenceCalibrationBucket],
};

const preferenceModelState: PreferenceModelState = {
  version: 1,
  sampleCount: 1,
  models: [{ weights: { agency: 0.1 }, bias: 0, sampleCount: 1 }],
  ensemble: { size: 1, method: "online-bagging" },
  history: [
    { type: "rating", rating: 1, featureVector: { agency: 0.2 } },
  ],
  learningRate: 0.05,
  maxHistory: 100,
  comparisonWeight: 1,
  ratingWeight: 0.25,
  weightDecay: 0,
  maxWeightAbs: 5,
  maxBiasAbs: 5,
};

const preferenceFeedbackSample: PreferenceFeedbackSample = {
  type: "comparison",
  preferred: "a",
  featureA: { agency: 1 },
  featureB: { agency: 0 },
};

const output: EvaluationAnalyticsOutput = {
  trajectorySummaries: [summary],
  metrics,
  degeneracy,
  featureVector,
  compositeScore,
  preferenceModelUpdate,
};

void log;
void input;
void output;
void preferenceScore;
void preferenceMetrics;
void preferenceModelState;
void preferenceFeedbackSample;
