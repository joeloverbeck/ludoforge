import type { Genome, RepairOperator } from "./types.js";
import type { SeededRng } from "../simulation-engine/types.js";

export interface RepairOptions<TGenome = Genome> {
  operators?: ReadonlyArray<RepairOperator<TGenome>>;
  rng?: SeededRng;
}

export const dslSafetyRepair: RepairOperator<Genome>;
export const defaultRepairOperators: ReadonlyArray<RepairOperator<Genome>>;

export function repairGenome<TGenome = Genome>(
  genome: TGenome,
  options?: RepairOptions<TGenome>
): TGenome | null;
