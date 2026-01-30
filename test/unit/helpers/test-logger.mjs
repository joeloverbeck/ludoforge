import pino from "pino";
import { createSilentReporter } from "../../../src/cli/create-progress-reporter.js";

export function createTestLogger() {
  return pino({ level: "silent" });
}

export { createSilentReporter };
