import type { CrossoverOperator, Genome } from "./types.js";
import type { SeededRng } from "../simulation-engine/types.js";

export interface CrossoverOptions<TGenome = Genome> {
  operators?: ReadonlyArray<CrossoverOperator<TGenome>>;
  rng?: SeededRng;
}

export const subtreeSwapCrossover: CrossoverOperator<Genome>;
export const defaultCrossoverOperators: ReadonlyArray<CrossoverOperator<Genome>>;

export function crossoverGenome<TGenome = Genome>(
  parentA: TGenome,
  parentB: TGenome,
  options?: CrossoverOptions<TGenome>
): TGenome | null;
