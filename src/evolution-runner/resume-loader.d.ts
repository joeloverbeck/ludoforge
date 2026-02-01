import type { GameDefinition } from "../dsl/types.js";
import type { PreferenceModelSnapshotRecord } from "../data-persistence/types.js";
import type { EvolutionRunnerConfig, MapElitesDescriptorConfig } from "./config.js";
import type { ArtifactsLayout, ResumeDefaults } from "./runner-defaults.js";

export interface ResumeGenome {
  id: string;
  definition: GameDefinition;
}

export interface ResumeConfigSnapshot {
  version: string;
  mapElites: {
    descriptors: MapElitesDescriptorConfig[];
  };
}

export interface ResumeLoaderOptions {
  baseDir?: string;
  runId: string;
  config: EvolutionRunnerConfig;
  artifacts?: ArtifactsLayout;
  resumeConfig?: ResumeDefaults;
}

export interface ResumeState {
  runId: string;
  runDir: string;
  generation: number;
  generationDir: string;
  population: ResumeGenome[];
  preferenceModel: PreferenceModelSnapshotRecord;
  runConfig: ResumeConfigSnapshot;
}

export function loadResumeState(options: ResumeLoaderOptions): Promise<ResumeState>;
