import { normalizeArray } from "./issue-collector.js";

export function validateTriggers(triggers, basePath, { validateExpr, validateEffect }) {
  triggers.forEach((trigger, index) => {
    if (trigger?.condition) {
      validateExpr(trigger.condition, `${basePath}/${index}/condition`);
    }
    normalizeArray(trigger?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `${basePath}/${index}/effects/${effectIndex}`);
    });
  });
}
