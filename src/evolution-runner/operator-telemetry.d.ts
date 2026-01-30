export interface OperatorTelemetryCounters {
  attempts: number;
  validOffspring: number;
  acceptedOffspring: number;
  gridContributions: {
    filledEmpty: number;
    improvedElite: number;
  };
}

export interface OperatorTelemetry {
  operators: Record<string, OperatorTelemetryCounters>;
}

export interface OperatorOutcome {
  valid?: boolean;
  accepted?: boolean;
  gridContribution?: "filledEmpty" | "improvedElite" | "none";
}

export function createTelemetry(operatorNames: ReadonlyArray<string>): OperatorTelemetry;
export function recordAttempt(telemetry: OperatorTelemetry, operatorName: string): void;
export function recordOutcome(
  telemetry: OperatorTelemetry,
  operatorName: string,
  outcome?: OperatorOutcome
): void;
export function mergeTelemetry(a: OperatorTelemetry, b: OperatorTelemetry): OperatorTelemetry;
export function serializeTelemetry(telemetry: OperatorTelemetry): OperatorTelemetry;
