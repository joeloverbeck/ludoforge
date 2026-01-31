import { parentPort, workerData } from "node:worker_threads";
import { runSimulation } from "./loop.js";
import { normalizeAgents } from "./agent-serialization.js";

const wakeSignal = workerData?.wake ? new Int32Array(workerData.wake) : null;
let port;

function notifyMain() {
  if (!wakeSignal) {
    return;
  }
  Atomics.store(wakeSignal, 0, 1);
  Atomics.notify(wakeSignal, 0);
  Atomics.store(wakeSignal, 0, 0);
}

function serializeError(error) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  return { name: error.name, message: error.message, stack: error.stack };
}

function hydrateConfig(input) {
  return {
    ...input,
    agents: normalizeAgents(input.agents ?? []),
  };
}

async function handleMessage(message) {
  if (message?.type === "run") {
    try {
      const result = await runSimulation(hydrateConfig(message.input));
      port.postMessage({ type: "result", index: message.index, result });
    } catch (error) {
      port.postMessage({ type: "error", index: message.index, error: serializeError(error) });
    } finally {
      notifyMain();
    }
  } else if (message?.type === "close") {
    port.postMessage({ type: "closed" });
    notifyMain();
    process.exit(0);
  }
}

parentPort.on("message", (message) => {
  if (message?.type === "init" && message.port) {
    port = message.port;
    port.on("message", handleMessage);
  }
});
