import type { GameDefinition } from "../dsl/types.js";

export interface SeedRecord {
  id: string;
  definition: GameDefinition;
}

export function loadSeedPopulation(seedPath: string): Promise<SeedRecord[]>;
