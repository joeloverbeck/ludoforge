/**
 * @typedef {object} ProgressReporter
 * @property {(ctx: { generation: number, totalGenerations: number }) => void} onGenerationStart
 * @property {(phase: string) => void} onPhaseStart
 * @property {() => void} onPhaseEnd
 * @property {(ctx: { generation: number, evaluated: number, rejected: number, bestFitness?: number }) => void} onGenerationEnd
 * @property {(ctx: { runId: string, generationsCompleted: number, halted: boolean, error?: string }) => void} onRunComplete
 * @property {(ctx: { generation: number, reason: string }) => void} onHalt
 */

/**
 * @param {{ silent?: boolean }} [options]
 * @returns {ProgressReporter}
 */
export function createProgressReporter(options = {}) {
  if (options.silent) {
    return createSilentReporter();
  }

  return {
    onGenerationStart() {},

    onPhaseStart() {},

    onPhaseEnd() {},

    onGenerationEnd({ generation, evaluated, rejected, bestFitness }) {
      const fitnessStr =
        bestFitness != null ? `, best fitness: ${bestFitness.toFixed(3)}` : "";
      const msg = `Generation ${generation + 1}: ${evaluated} evaluated, ${rejected} rejected${fitnessStr}`;
      process.stderr.write(`${msg}\n`);
    },

    onRunComplete({ runId, generationsCompleted, halted, error }) {
      const status = halted ? "halted" : "completed";
      const errorSuffix = error ? ` (${error})` : "";
      process.stderr.write(
        `Run ${runId} ${status} after ${generationsCompleted} generation(s).${errorSuffix}\n`,
      );
    },

    onHalt({ generation, reason }) {
      process.stderr.write(
        `Halted at generation ${generation + 1}: ${reason}\n`,
      );
    },
  };
}

/** @returns {ProgressReporter} */
export function createSilentReporter() {
  return {
    onGenerationStart() {},
    onPhaseStart() {},
    onPhaseEnd() {},
    onGenerationEnd() {},
    onRunComplete() {},
    onHalt() {},
  };
}
