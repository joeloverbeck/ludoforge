import { MessageChannel, Worker, receiveMessageOnPort } from "node:worker_threads";

const WORKER_URL = new URL("./worker-entry.js", import.meta.url);

function buildError(payload) {
  if (!payload || typeof payload !== "object") {
    return new Error("Worker failed");
  }
  const error = new Error(payload.message ?? "Worker failed");
  if (payload.name) {
    error.name = payload.name;
  }
  if (payload.stack) {
    error.stack = payload.stack;
  }
  return error;
}

export function runWorkerPool(inputs, concurrency) {
  const total = inputs.length;
  if (total === 0) {
    return [];
  }

  const poolSize = Math.min(concurrency, total);
  const wakeSignal = new Int32Array(new SharedArrayBuffer(4));
  const workers = [];
  const ports = [];
  const results = new Array(total);
  let nextIndex = 0;
  let completed = 0;
  let closedWorkers = 0;
  let failure = null;

  function assignWork(port) {
    if (nextIndex < total) {
      const index = nextIndex;
      nextIndex += 1;
      port.postMessage({ type: "run", index, input: inputs[index] });
      return true;
    }
    port.postMessage({ type: "close" });
    return false;
  }

  function handleMessage(port, message) {
    if (message?.type === "result") {
      results[message.index] = message.result;
      completed += 1;
      if (completed < total) {
        assignWork(port);
      } else {
        port.postMessage({ type: "close" });
      }
      return;
    }
    if (message?.type === "error") {
      failure = buildError(message.error);
      for (const portToClose of ports) {
        portToClose.postMessage({ type: "close" });
      }
      return;
    }
    if (message?.type === "closed") {
      closedWorkers += 1;
    }
  }

  for (let index = 0; index < poolSize; index += 1) {
    const { port1, port2 } = new MessageChannel();
    const worker = new Worker(WORKER_URL, {
      type: "module",
      workerData: { wake: wakeSignal.buffer },
    });
    worker.postMessage({ type: "init", port: port2 }, [port2]);
    worker.unref();
    workers.push(worker);
    ports.push(port1);
    assignWork(port1);
  }

  while ((failure == null && completed < total) || closedWorkers < poolSize) {
    let received = false;
    for (const port of ports) {
      let message;
      while ((message = receiveMessageOnPort(port)) !== undefined) {
        received = true;
        handleMessage(port, message.message ?? message);
      }
    }
    if (!received) {
      Atomics.wait(wakeSignal, 0, 0, 1000);
      Atomics.store(wakeSignal, 0, 0);
    }
  }

  if (failure) {
    throw failure;
  }

  return results;
}
