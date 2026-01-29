import type { GameDefinition } from "../dsl/types.js";

export interface FolderSeederOptions {
  folderPath: string;
  populationSize: number;
  rngSeed: number;
  onInvalid?: "error" | "skip";
}

export interface FolderSeederReport {
  filesFound: number;
  filesLoaded: number;
  filesSkipped: number;
  genomesReturned: number;
}

export interface FolderSeederResult {
  genomes: Array<{ id: string; definition: GameDefinition }>;
  report: FolderSeederReport;
}

export function loadFolderSeeds(
  options: FolderSeederOptions,
): Promise<FolderSeederResult>;
