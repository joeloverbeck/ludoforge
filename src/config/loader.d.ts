import type { ValidationError, ValidationResult } from "./validator.js";

export interface ConfigEntry {
  name: string;
  file: string;
  schema: string;
}

export interface ConfigLoadResult<T = unknown> extends ValidationResult {
  name: string;
  config: T | null;
}

export interface ConfigVersionSnapshot {
  versions: Record<string, number | null>;
  fingerprint: string;
}

export interface ConfigSetResult extends ValidationResult {
  config: Record<string, unknown>;
  configVersion: ConfigVersionSnapshot | null;
}

export const DEFAULT_CONFIG_ENTRIES: ConfigEntry[];

export function loadConfigFile(options: {
  name: string;
  file?: string;
  schema?: string;
  configDir?: string | URL;
  schemaDir?: string | URL;
}): Promise<ConfigLoadResult>;

export function loadConfigSet(options?: {
  entries?: ConfigEntry[];
  configDir?: string | URL;
  schemaDir?: string | URL;
}): Promise<ConfigSetResult>;
