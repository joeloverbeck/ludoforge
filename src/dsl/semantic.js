import { validateIntBounds } from "./semantic/bounds-validator.js";
import { createIssueCollector, joinPath, normalizeArray } from "./semantic/issue-collector.js";
import { buildIdIndex } from "./semantic/id-index.js";
import { domainForRef } from "./semantic/domain.js";
import { evaluateExpr } from "./semantic/expr-evaluator.js";
import { createRefValidator } from "./semantic/ref-validator.js";
import { createSemanticValidators } from "./semantic/semantic-validators.js";
import {
  reportAggregateActionIssues,
  reportFreeLunchIssue,
  summarizeAction,
} from "./semantic/action-analysis.js";

const warningRules = new Set([
  "action-precondition-unsatisfiable",
  "unused-variable",
  "unused-token-type",
  "unused-zone",
]);

const infoRules = new Set(["dominant-action", "free-lunch"]);

function classifySeverity({ path, rule }) {
  if (rule === "ref-unknown" && path.startsWith("/termination/conditions/")) {
    return "error";
  }
  if (warningRules.has(rule)) {
    return "warning";
  }
  if (infoRules.has(rule)) {
    return "info";
  }
  return "error";
}

export function collectSemanticIssues(definition) {
  const { issues, pushIssue } = createIssueCollector({ classifySeverity });
  if (!definition || typeof definition !== "object") {
    pushIssue("", "Game definition must be an object", "invalid-definition");
    return issues;
  }

  const variables = normalizeArray(definition.state?.variables);
  const tokenTypes = normalizeArray(definition.state?.tokenTypes);
  const zones = normalizeArray(definition.state?.zones);

  const {
    variableIds,
    tokenTypeIds,
    zoneIds,
    tokenAttributeIds,
    tokenAttributeDefs,
    variableById,
    zoneById,
  } = buildIdIndex({ variables, tokenTypes, zones });

  variables.forEach((variable, index) => {
    const basePath = `/state/variables/${index}`;
    validateIntBounds({
      subject: variable,
      path: joinPath(basePath, "type"),
      initialPath: joinPath(basePath, "initial"),
    }).forEach((issue) => {
      pushIssue(issue.path, issue.message, issue.rule);
    });
  });

  tokenTypes.forEach((tokenType, index) => {
    const attributes = normalizeArray(tokenType?.attributes);
    attributes.forEach((attribute, attributeIndex) => {
      const basePath = `/state/tokenTypes/${index}/attributes/${attributeIndex}`;
      validateIntBounds({
        subject: attribute,
        path: joinPath(basePath, "type"),
        initialPath: joinPath(basePath, "initial"),
      }).forEach((issue) => {
        pushIssue(issue.path, issue.message, issue.rule);
      });
    });
  });

  zones.forEach((zone, index) => {
    const tokenType = zone?.tokenType;
    if (typeof tokenType === "string" && !tokenTypeIds.has(tokenType)) {
      pushIssue(
        `/state/zones/${index}/tokenType`,
        `Unknown token type: ${tokenType}`,
        "token-type-unknown"
      );
    }
  });

  const terminationConditions = normalizeArray(definition.termination?.conditions);
  const maxTurns = definition.termination?.maxTurns;
  if (terminationConditions.length === 0) {
    pushIssue(
      "/termination/conditions",
      "At least one termination condition is required",
      "termination-conditions"
    );
  }
  if (typeof maxTurns !== "number") {
    pushIssue("/termination/maxTurns", "A maxTurns fallback is required", "termination-max-turns");
  }

  const noLegalActions = definition.turn?.noLegalActions;
  if (noLegalActions && typeof noLegalActions === "object") {
    const policy = noLegalActions.policy;
    const defaultOutcome = noLegalActions.defaultOutcome;
    if (policy === "terminate") {
      if (!defaultOutcome) {
        pushIssue(
          "/turn/noLegalActions/defaultOutcome",
          "defaultOutcome is required when policy is terminate",
          "no-legal-actions-default-outcome"
        );
      }
    } else if (policy === "pass" || policy === "error") {
      if (defaultOutcome) {
        pushIssue(
          "/turn/noLegalActions/defaultOutcome",
          "defaultOutcome is only valid for terminate policy",
          "no-legal-actions-default-outcome"
        );
      }
    }
  }

  const allowedMetaIds = new Set(["legalActionCount", "hasLegalActions"]);
  const {
    validateRef,
    validateZoneRef,
    validateTokenTypeRef,
    usedVariableIds,
    usedTokenTypeIds,
    usedZoneIds,
  } = createRefValidator({
    variableIds,
    tokenTypeIds,
    zoneIds,
    tokenAttributeIds,
    allowedMetaIds,
    pushIssue,
  });

  const domainContext = { variableById, tokenAttributeDefs };

  const exprEvalContext = { domainForRef, domainContext };

  const { validateSelector, validateEffect, validateExpr } = createSemanticValidators({
    validateRef,
    validateZoneRef,
    validateTokenTypeRef,
    joinPath,
    zoneById,
    pushIssue,
  });

  const actions = normalizeArray(definition.actions);
  const actionSummaries = [];
  actions.forEach((action, index) => {
    const costs = normalizeArray(action?.costs);
    const effects = normalizeArray(action?.effects);
    const targets = normalizeArray(action?.params);
    const preconditionEvaluation = action?.preconditions
      ? evaluateExpr(action.preconditions, exprEvalContext)
      : { possible: true, alwaysTrue: true };
    if (action?.preconditions) {
      validateExpr(action.preconditions, `/actions/${index}/preconditions`);
      if (preconditionEvaluation.possible === false) {
        pushIssue(
          `/actions/${index}/preconditions`,
          "Action preconditions are unsatisfiable given declared bounds",
          "action-precondition-unsatisfiable"
        );
      }
    }
    const actionBindingIds = new Set(
      targets.map((t) => t?.id).filter((id) => typeof id === "string")
    );
    const effectOptions = actionBindingIds.size > 0 ? { actionBindingIds } : {};
    costs.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/costs/${effectIndex}`, effectOptions);
    });
    effects.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/effects/${effectIndex}`, effectOptions);
    });
    targets.forEach((target, targetIndex) => {
      validateSelector(target?.domain?.selector, `/actions/${index}/params/${targetIndex}/selector`);
    });

    const summary = summarizeAction({
      action,
      costs,
      effects,
      targets,
      preconditionEvaluation,
    });
    reportFreeLunchIssue({ actionIndex: index, summary, pushIssue });
    actionSummaries.push({ index, ...summary });
  });

  reportAggregateActionIssues({ actions, actionSummaries, pushIssue });

  const triggers = normalizeArray(definition.triggers);
  triggers.forEach((trigger, index) => {
    if (trigger?.condition) {
      validateExpr(trigger.condition, `/triggers/${index}/condition`);
    }
    normalizeArray(trigger?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `/triggers/${index}/effects/${effectIndex}`);
    });
  });

  const stepEffects = normalizeArray(definition.turn?.stepEffects);
  stepEffects.forEach((trigger, index) => {
    if (trigger?.condition) {
      validateExpr(trigger.condition, `/turn/stepEffects/${index}/condition`);
    }
    normalizeArray(trigger?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `/turn/stepEffects/${index}/effects/${effectIndex}`);
    });
  });

  const scheduler = definition.turn?.scheduler;
  if (scheduler === "priority_queue") {
    const orderByVar = definition.turn?.orderBy?.variable;
    if (typeof orderByVar === "string" && !variableIds.has(orderByVar)) {
      pushIssue(
        "/turn/orderBy/variable",
        `priority_queue orderBy references unknown variable: ${orderByVar}`,
        "ref-unknown"
      );
    }
  }
  if (scheduler === "token_holder") {
    const tokenType = definition.turn?.tokenType;
    if (typeof tokenType === "string" && !tokenTypeIds.has(tokenType)) {
      pushIssue(
        "/turn/tokenType",
        `token_holder references unknown token type: ${tokenType}`,
        "token-type-unknown"
      );
    }
    const zone = definition.turn?.zone;
    if (typeof zone === "string" && !zoneIds.has(zone)) {
      pushIssue(
        "/turn/zone",
        `token_holder references unknown zone: ${zone}`,
        "zone-unknown"
      );
    }
  }
  if (scheduler === "simultaneous") {
    const order = definition.turn?.resolution?.order;
    if (order != null && order !== "by_player_id" && order !== "random") {
      pushIssue(
        "/turn/resolution/order",
        `simultaneous resolution order is invalid: ${order}`,
        "turn-resolution-order"
      );
    }
  }

  terminationConditions.forEach((termination, index) => {
    if (termination?.condition) {
      validateExpr(termination.condition, `/termination/conditions/${index}/condition`);
    }
  });

  if (definition.termination?.scoring?.perPlayer) {
    validateExpr(definition.termination.scoring.perPlayer, "/termination/scoring/perPlayer");
  }

  variableIds.forEach((id) => {
    if (!usedVariableIds.has(id)) {
      pushIssue("/state/variables", `Variable is never referenced: ${id}`, "unused-variable");
    }
  });

  tokenTypeIds.forEach((id) => {
    if (!usedTokenTypeIds.has(id)) {
      pushIssue(
        "/state/tokenTypes",
        `Token type is never referenced: ${id}`,
        "unused-token-type"
      );
    }
  });

  zoneIds.forEach((id) => {
    if (!usedZoneIds.has(id)) {
      pushIssue("/state/zones", `Zone is never referenced: ${id}`, "unused-zone");
    }
  });

  return issues;
}

export function validateSemanticDefinition(definition) {
  const issues = collectSemanticIssues(definition);
  const hasErrors = issues.some((issue) => issue.severity === "error");
  return {
    valid: !hasErrors,
    issues,
  };
}
