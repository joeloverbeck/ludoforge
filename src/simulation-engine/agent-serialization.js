import { createGreedyPolicy } from "./agents/greedy.js";
import { createRandomPolicy } from "./agents/random.js";

const BUILTIN_AGENT_KINDS = new Set(["random", "greedy"]);

export function isAgentDescriptor(agent) {
  return Boolean(agent && typeof agent === "object" && typeof agent.kind === "string");
}

export function isWorkerSafeAgent(agent) {
  if (!isAgentDescriptor(agent) || !BUILTIN_AGENT_KINDS.has(agent.kind)) {
    return false;
  }
  if (agent.kind === "greedy" && typeof agent.options?.scoreAction === "function") {
    return false;
  }
  return true;
}

function materializeAgent(agent) {
  if (agent.kind === "random") {
    return createRandomPolicy();
  }
  if (agent.kind === "greedy") {
    return createGreedyPolicy(agent.options);
  }
  throw new Error(`Unknown agent kind: ${agent.kind}`);
}

export function normalizeAgents(agents = []) {
  return agents.map((agent, index) => {
    if (agent && typeof agent.selectAction === "function") {
      return agent;
    }
    if (isAgentDescriptor(agent)) {
      const controller = materializeAgent(agent);
      if (agent.id != null) {
        controller.id = agent.id;
      }
      if (agent.role != null) {
        controller.role = agent.role;
      }
      return controller;
    }
    throw new Error(
      `Invalid agent at index ${index}: expected object with selectAction() ` +
      `or AgentDescriptor { kind }, got ${JSON.stringify(agent)}`
    );
  });
}
