import pino from "pino";

/**
 * @param {{ level?: string, pretty?: boolean }} [options]
 * @returns {import("pino").Logger}
 */
export function createLogger(options = {}) {
  const level = options.level ?? process.env.LOG_LEVEL ?? "info";
  const pretty = options.pretty ?? false;

  if (pretty) {
    return pino({
      level,
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    });
  }

  return pino({ level });
}
