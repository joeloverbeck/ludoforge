import type {
  DescriptorSet,
  Genome,
  MapElitesConfig,
  MapElitesDescriptorConfig,
  MapElitesResult,
  Population,
} from "./types.js";

export function binDescriptorValue(
  value: number,
  config: MapElitesDescriptorConfig
): number;

export function getDescriptorCoordinates(
  descriptors: DescriptorSet,
  config: MapElitesConfig
): ReadonlyArray<number>;

export function getNicheId(
  config: MapElitesConfig,
  coordinates: ReadonlyArray<number>
): string;

export function placePopulationInMapElites<TGenome = Genome>(
  population: Population<TGenome>,
  config: MapElitesConfig<TGenome>
): MapElitesResult<TGenome>;
