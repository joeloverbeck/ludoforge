export type { ValidationError, ValidationResult } from "./validator.js";
export type {
  ConfigEntry,
  ConfigLoadResult,
  ConfigSetResult,
  ConfigVersionSnapshot,
} from "./loader.js";

export { DEFAULT_CONFIG_ENTRIES, loadConfigFile, loadConfigSet } from "./loader.js";
export { createConfigFingerprint, normalizeConfig } from "./fingerprint.js";
