import type {
  EvaluationAnalyticsInput,
  SimulationLog,
  TrajectorySummary,
} from "./types.js";

export const LOG_ADAPTER_VERSION: "0.1.0";

export interface LogAdapterInput {
  version: typeof LOG_ADAPTER_VERSION;
  log: SimulationLog;
}

export type LogAdapterErrorCode =
  | "invalid_input"
  | "invalid_version"
  | "missing_definition"
  | "missing_results"
  | "invalid_result";

export interface LogAdapterErrorDetails {
  index?: number;
  version?: unknown;
}

export class LogAdapterError extends Error {
  code: LogAdapterErrorCode;
  details?: LogAdapterErrorDetails;
  constructor(code: LogAdapterErrorCode, message: string, details?: LogAdapterErrorDetails);
}

export interface LogAdapterSuccess {
  ok: true;
  value: {
    input: EvaluationAnalyticsInput;
    trajectorySummaries: TrajectorySummary[];
  };
}

export interface LogAdapterFailure {
  ok: false;
  error: LogAdapterError;
}

export type LogAdapterResult = LogAdapterSuccess | LogAdapterFailure;

export function adaptSimulationLog(input: LogAdapterInput): LogAdapterResult;
