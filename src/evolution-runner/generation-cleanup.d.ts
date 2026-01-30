export interface PruneOptions {
  baseDir: string;
  runId: string;
  maxRetained: number | null | undefined;
}

export interface PruneRemovedEntry {
  name: string;
  generation: number;
}

export interface PruneResult {
  removed: PruneRemovedEntry[];
}

export function pruneOldGenerations(options: PruneOptions): Promise<PruneResult>;
