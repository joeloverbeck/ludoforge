import { Listr } from "listr2";

/**
 * @typedef {object} ProgressReporter
 * @property {(ctx: { generation: number, totalGenerations: number }) => void} onGenerationStart
 * @property {(phase: string) => void} onPhaseStart
 * @property {() => void} onPhaseEnd
 * @property {(ctx: { generation: number, evaluated: number, rejected: number, bestFitness?: number }) => void} onGenerationEnd
 * @property {(ctx: { runId: string, generationsCompleted: number, halted: boolean }) => void} onRunComplete
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

  let currentTask = null;

  return {
    onGenerationStart({ generation, totalGenerations }) {
      const task = new Listr(
        [
          {
            title: `Generation ${generation + 1}/${totalGenerations}`,
            task: (_, task) => {
              currentTask = task;
            },
          },
        ],
        { renderer: "default" },
      );
      task.run().catch(() => {});
    },

    onPhaseStart(phase) {
      if (currentTask) {
        currentTask.title = `${currentTask.title.split(" — ")[0]} — ${phase}`;
      }
    },

    onPhaseEnd() {},

    onGenerationEnd({ generation, evaluated, rejected, bestFitness }) {
      const fitnessStr =
        bestFitness != null ? `, best fitness: ${bestFitness.toFixed(3)}` : "";
      const msg = `Generation ${generation + 1}: ${evaluated} evaluated, ${rejected} rejected${fitnessStr}`;
      process.stderr.write(`${msg}\n`);
      currentTask = null;
    },

    onRunComplete({ runId, generationsCompleted, halted }) {
      const status = halted ? "halted" : "completed";
      process.stderr.write(
        `Run ${runId} ${status} after ${generationsCompleted} generation(s).\n`,
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
