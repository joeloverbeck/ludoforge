import { runSimulation } from "./loop.js";
import { isWorkerSafeAgent } from "./agent-serialization.js";
import { runWorkerPool } from "./worker-pool.js";

function buildStepControl(input, hooks, context) {
  const hasHook = typeof hooks?.onStep === "function";
  if (!hasHook) {
    return input.stepControl;
  }

  const originalStepControl = input.stepControl;

  return {
    pauseOnStep: originalStepControl?.pauseOnStep,
    onStep(step) {
      originalStepControl?.onStep?.(step);
      hooks.onStep(step, context);
    },
  };
}

function buildWorkerInput(input) {
  if (!input || typeof input !== "object") {
    return null;
  }
  if (!Array.isArray(input.agents) || input.agents.length === 0) {
    return null;
  }
  if (input.rng) {
    return null;
  }
  if (typeof input.loopDetection?.stateHasher === "function") {
    return null;
  }

  const agents = input.agents.map((agent) => (isWorkerSafeAgent(agent) ? agent : null));
  if (agents.some((agent) => agent == null)) {
    return null;
  }

  const loopDetection = input.loopDetection
    ? { ...input.loopDetection, stateHasher: undefined }
    : undefined;

  return { ...input, agents, loopDetection, rng: undefined, stepControl: undefined };
}

function replayStepHooks(result, input, hooks, context) {
  const onStep = typeof hooks?.onStep === "function" ? hooks.onStep : null;
  const stepControl = input.stepControl;
  if (!onStep && typeof stepControl?.onStep !== "function") {
    return;
  }
  for (const step of result.trajectory.steps) {
    stepControl?.onStep?.(step);
    onStep?.(step, context);
  }
}

export async function runBatchSimulations(inputs, hooks = {}, options = {}) {
  if (!Array.isArray(inputs)) {
    throw new Error("runBatchSimulations requires an array of inputs.");
  }

  const concurrency =
    typeof options?.concurrency === "number" && Number.isInteger(options.concurrency)
      ? options.concurrency
      : 1;

  const workerInputs =
    concurrency > 1 ? inputs.map((input) => buildWorkerInput(input)) : null;

  if (workerInputs && workerInputs.every((input) => input)) {
    const results = runWorkerPool(workerInputs, concurrency);
    let metrics =
      typeof hooks.reduceMetrics === "function"
        ? hooks.initialMetrics ?? {}
        : hooks.initialMetrics;

    results.forEach((result, index) => {
      const context = { index, input: inputs[index] };
      replayStepHooks(result, inputs[index], hooks, context);
      hooks.onTerminal?.(result, context);

      if (typeof hooks.reduceMetrics === "function") {
        const nextMetrics = hooks.reduceMetrics(metrics, result, context);
        if (nextMetrics !== undefined) {
          metrics = nextMetrics;
        }
      }
    });

    return { results, metrics };
  }

  const results = [];
  let metrics =
    typeof hooks.reduceMetrics === "function"
      ? hooks.initialMetrics ?? {}
      : hooks.initialMetrics;

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const context = { index, input };
    const stepControl = buildStepControl(input, hooks, context);
    const config = stepControl ? { ...input, stepControl } : input;

    const result = await runSimulation(config);
    results.push(result);

    hooks.onTerminal?.(result, context);

    if (typeof hooks.reduceMetrics === "function") {
      const nextMetrics = hooks.reduceMetrics(metrics, result, context);
      if (nextMetrics !== undefined) {
        metrics = nextMetrics;
      }
    }
  }

  return { results, metrics };
}
