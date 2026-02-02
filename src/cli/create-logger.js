import pino from "pino";
import pinoPretty from "pino-pretty";

/**
 * @param {{ level?: string, pretty?: boolean }} [options]
 * @returns {import("pino").Logger}
 */
export function createLogger(options = {}) {
  const level = options.level ?? process.env.LOG_LEVEL ?? "info";
  const pretty = options.pretty ?? false;

  if (pretty) {
    // Use pino-pretty as a synchronous stream (main thread) instead of
    // transport worker thread.  This ensures flush() is reliable and log
    // output does not race with interactive prompts written to stderr.
    const prettyStream = pinoPretty({ colorize: true, sync: true });
    return pino({ level }, prettyStream);
  }

  return pino({ level });
}
