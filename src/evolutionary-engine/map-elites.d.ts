import type {
  BinToken,
  DescriptorSet,
  Genome,
  MapElitesConfig,
  MapElitesDescriptorConfig,
  MapElitesResult,
  Population,
} from "./types.js";

export function binDescriptorValue(
  value: number | null | undefined,
  config: MapElitesDescriptorConfig
): BinToken;

export function getDescriptorCoordinates(
  descriptors: DescriptorSet | null | undefined,
  config: MapElitesConfig
): ReadonlyArray<BinToken>;

export function getNicheId(
  config: MapElitesConfig,
  coordinates: ReadonlyArray<BinToken>
): string;

export function placePopulationInMapElites<TGenome = Genome>(
  population: Population<TGenome>,
  config: MapElitesConfig<TGenome>
): MapElitesResult<TGenome>;
