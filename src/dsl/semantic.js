import { validateIntBounds } from "./semantic/bounds-validator.js";
import { createIssueCollector, joinPath, normalizeArray } from "./semantic/issue-collector.js";
import { buildIdIndex } from "./semantic/id-index.js";
import { domainForRef } from "./semantic/domain.js";
import { evaluateExpr } from "./semantic/expr-evaluator.js";
import { createRefValidator } from "./semantic/ref-validator.js";
import { createSemanticValidators } from "./semantic/semantic-validators.js";
import { validateZoneTokenTypes } from "./semantic/zone-validator.js";
import { validateTerminationBlock, validateTerminationExpressions } from "./semantic/termination-validator.js";
import { validateNoLegalActionsPolicy } from "./semantic/no-legal-actions-validator.js";
import { validateScheduler } from "./semantic/scheduler-validator.js";
import { validateActions } from "./semantic/action-validator.js";
import { validateTriggers } from "./semantic/trigger-validator.js";
import { reportUnusedResources } from "./semantic/unused-detector.js";

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

  validateZoneTokenTypes(zones, tokenTypeIds, pushIssue);

  const terminationConditions = validateTerminationBlock(definition, pushIssue);

  validateNoLegalActionsPolicy(definition, pushIssue);

  const allowedMetaIds = new Set(["legalActionCount", "hasLegalActions"]);
  const {
    validateRef,
    validateZoneRef,
    validateTokenTypeRef,
    validateVariableRef,
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
    validateVariableRef,
    joinPath,
    zoneById,
    pushIssue,
  });

  validateActions(definition, {
    validateExpr,
    validateEffect,
    validateSelector,
    evaluateExpr,
    exprEvalContext,
    pushIssue,
  });

  validateTriggers(normalizeArray(definition.triggers), "/triggers", { validateExpr, validateEffect });
  validateTriggers(normalizeArray(definition.turn?.stepEffects), "/turn/stepEffects", { validateExpr, validateEffect });

  validateScheduler(definition, { variableIds, tokenTypeIds, zoneIds, pushIssue });

  validateTerminationExpressions(terminationConditions, definition, validateExpr);

  reportUnusedResources({
    variableIds,
    tokenTypeIds,
    zoneIds,
    usedVariableIds,
    usedTokenTypeIds,
    usedZoneIds,
    pushIssue,
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
