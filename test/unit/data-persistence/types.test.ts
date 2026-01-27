import type { GameDefinition } from "../../../src/dsl/types.js";
import type { GameState } from "../../../src/game-kernel/state.js";
import type { Trajectory } from "../../../src/simulation-engine/types.js";
import type {
  BaseRecord,
  DataPersistenceEnvelope,
  FeedbackRecord,
  GameDefinitionRecord,
  MetricsRecord,
  PreferenceModelSnapshotRecord,
  SimulationRunRecord,
  TrajectoryLogRecord,
} from "../../../src/data-persistence/types.js";
import type {
  FeatureVector,
  MetricResults,
  PreferenceFeedbackSample,
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
  turn: { currentPlayer: 1, phase: null, turn: 1 },
  nextTokenId: 1,
};

const trajectory: Trajectory = {
  steps: [
    {
      turn: 1,
      phase: null,
      playerId: 1,
      actionId: "pass",
      legalActionCount: 1,
      state,
    },
  ],
};

const summary: TrajectorySummary = {
  stepCount: 1,
  turnCount: 1,
  terminalOutcome: {
    terminated: true,
    reason: "condition",
    outcomes: { 1: "draw", 2: "draw" },
  },
  terminationReason: "condition",
  actionCounts: { pass: 1 },
  uniqueStateCount: 1,
};

const base: BaseRecord = {
  id: "record-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:00Z",
  engineVersion: "engine-0.1.0",
  seed: 42,
};

const gameRecord: GameDefinitionRecord = {
  ...base,
  definition,
  descriptors: { name: "Sample", tags: ["prototype"] },
};

const runRecord: SimulationRunRecord = {
  ...base,
  id: "run-1",
  gameId: "game-1",
  agents: [{ kind: "random", id: 1 }],
  summary,
};

const trajectoryRecord: TrajectoryLogRecord = {
  ...base,
  id: "trajectory-1",
  gameId: "game-1",
  runId: "run-1",
  trajectory,
};

const metrics: MetricResults = [{ id: "agency", value: 0.75 }];
const featureVector: FeatureVector = { agency: 0.75 };

const metricsRecord: MetricsRecord = {
  ...base,
  id: "metrics-1",
  gameId: "game-1",
  runId: "run-1",
  metrics,
  featureVector,
};

const feedbackSample: PreferenceFeedbackSample = {
  type: "rating",
  rating: 4,
  featureVector,
};

const feedbackRecord: FeedbackRecord = {
  ...base,
  id: "feedback-1",
  gameId: "game-1",
  runId: "run-1",
  feedback: feedbackSample,
  tags: ["ux"],
  rationale: "Felt balanced overall.",
};

const preferenceSnapshot: PreferenceModelSnapshotRecord = {
  ...base,
  id: "pref-model-1",
  trainingWindow: {
    start: "2024-12-01T00:00:00Z",
    end: "2025-01-01T00:00:00Z",
  },
  hyperparams: {
    learningRate: 0.05,
    comparisonWeight: 1,
    ratingWeight: 0.25,
    weightDecay: 0,
    maxWeightAbs: 5,
    maxBiasAbs: 5,
  },
  metrics: {
    accuracy: 0.82,
  },
  weights: featureVector,
  bias: 0.1,
};

const envelopes: DataPersistenceEnvelope[] = [
  { type: "game-definition", payload: gameRecord },
  { type: "simulation-run", payload: runRecord },
  { type: "trajectory-log", payload: trajectoryRecord },
  { type: "metrics", payload: metricsRecord },
  { type: "feedback", payload: feedbackRecord },
  { type: "preference-model-snapshot", payload: preferenceSnapshot },
];

void envelopes;

// @ts-expect-error - version is required on records
const missingVersion: GameDefinitionRecord = {
  id: "game-2",
  createdAt: "2025-01-02T00:00:00Z",
  definition,
};

void missingVersion;
