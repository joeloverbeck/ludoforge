export interface ArtifactsLayout {
  runMetadata: string;
  generationDirPattern: string;
  population: string;
  evaluated: string;
  rejected: string;
  mapElites: string;
  shortlist: string;
  feedback: string;
  preferenceModel: string;
  determinism: string;
}

export interface ResumeDefaults {
  requireConfigMatch: boolean;
  requireDescriptorMatch: boolean;
}

export interface RunnerLayout {
  version: number;
  runsRoot: string;
  artifacts: ArtifactsLayout;
  resume: ResumeDefaults;
}

export const DEFAULT_RUNNER_LAYOUT: RunnerLayout;

export function formatGenerationDirName(
  pattern: string,
  generation: number,
): string;
