import type { Genome, MutationOperator, RepairOperator } from "./types.js";
import type { SeededRng } from "../simulation-engine/types.js";

export interface MutationOptions<TGenome = Genome> {
  operators?: ReadonlyArray<MutationOperator<TGenome>>;
  rng?: SeededRng;
}

export interface MutationRepairOptions<TGenome = Genome> extends MutationOptions<TGenome> {
  repairOperators?: ReadonlyArray<RepairOperator<TGenome>>;
}

export const numericTweakMutation: MutationOperator<Genome>;
export const booleanToggleMutation: MutationOperator<Genome>;
export const defaultMutationOperators: ReadonlyArray<MutationOperator<Genome>>;

export function mutateGenome<TGenome = Genome>(
  genome: TGenome,
  options?: MutationOptions<TGenome>
): TGenome;

export function mutateAndRepairGenome<TGenome = Genome>(
  genome: TGenome,
  options?: MutationRepairOptions<TGenome>
): TGenome | null;
