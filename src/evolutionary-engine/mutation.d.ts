import type { Genome, MutationOperator, RepairOperator } from "./types.js";
import type { SeededRng } from "../simulation-engine/types.js";
import type { OperatorSelector, WeightedSelector } from "./operator-selector.js";

export interface MutationOptions<TGenome = Genome> {
  operators?: ReadonlyArray<MutationOperator<TGenome>>;
  rng?: SeededRng;
  selector?: OperatorSelector;
}

export interface MutationRepairOptions<TGenome = Genome> extends MutationOptions<TGenome> {
  repairOperators?: ReadonlyArray<RepairOperator<TGenome>>;
}

export interface MutationResult<TGenome = Genome> {
  genome: TGenome | null;
  operatorName: string | null;
}

export const numericTweakMutation: MutationOperator<Genome>;
export const booleanToggleMutation: MutationOperator<Genome>;
export const enumCycleMutation: MutationOperator<Genome>;
export const actionDuplicateMutation: MutationOperator<Genome>;
export const actionRemoveMutation: MutationOperator<Genome>;
export const actionEffectMagnitudeMutation: MutationOperator<Genome>;
export const preconditionNegationMutation: MutationOperator<Genome>;
export const terminationThresholdMutation: MutationOperator<Genome>;
export const terminationOutcomeMutation: MutationOperator<Genome>;
export const phaseAddMutation: MutationOperator<Genome>;
export const phaseRemoveMutation: MutationOperator<Genome>;
export const tokenTypeZoneTargetAddMutation: MutationOperator<Genome>;
export const tokenTypeRemoveMutation: MutationOperator<Genome>;
export const zoneRemoveMutation: MutationOperator<Genome>;
export const defaultMutationOperators: ReadonlyArray<MutationOperator<Genome>>;

export function mutateGenome<TGenome = Genome>(
  genome: TGenome,
  options?: MutationOptions<TGenome>
): TGenome | MutationResult<TGenome>;

export function mutateAndRepairGenome<TGenome = Genome>(
  genome: TGenome,
  options?: MutationRepairOptions<TGenome>
): TGenome | MutationResult<TGenome> | null;

export type { OperatorSelector };
export { WeightedSelector };
