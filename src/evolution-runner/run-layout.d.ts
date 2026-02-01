export interface RunMetadata {
  runId: string;
  createdAt: string;
  [key: string]: unknown;
}

export function createRunId(): string;
export function isValidRunId(runId: string): boolean;
export function assertValidRunId(runId: string): void;
export function resolveRunsRoot(baseDir?: string, runsRoot?: string): string;
export function resolveRunDir(baseDir: string, runId: string): string;
export function resolveRunPath(runDir: string, ...segments: string[]): string;
export function writeRunMetadata(
  baseDir: string,
  runId: string,
  metadata?: Record<string, unknown>,
  options?: { runMetadataFilename?: string },
): Promise<string>;
export function listRuns(baseDir?: string, runsRoot?: string): Promise<string[]>;
