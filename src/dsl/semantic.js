import { validateIntBounds } from "./semantic/bounds-validator.js";
import { createIssueCollector, joinPath, normalizeArray } from "./semantic/issue-collector.js";
import { buildIdIndex } from "./semantic/id-index.js";
import { domainForRef } from "./semantic/domain.js";
import { evaluateExpr } from "./semantic/expr-evaluator.js";
import { createRefValidator } from "./semantic/ref-validator.js";
import { createSemanticValidators } from "./semantic/semantic-validators.js";
import { validateZoneTokenTypes } from "./semantic/zone-validator.js";
import { validateTerminationBlock, validateTerminationExpressions, validateTerminationThresholds } from "./semantic/termination-validator.js";
import { validateNoLegalActionsPolicy } from "./semantic/no-legal-actions-validator.js";
import { validateScheduler } from "./semantic/scheduler-validator.js";
import { validateActions } from "./semantic/action-validator.js";
import { validateTriggers } from "./semantic/trigger-validator.js";
import { reportUnusedResources } from "./semantic/unused-detector.js";
import { detectDuplicateActions } from "./semantic/duplicate-action-detector.js";
import { detectCancellingEffects } from "./semantic/cancelling-effect-detector.js";
import { detectUnusedParams } from "./semantic/unused-param-detector.js";
import { detectOverlappingTerminations } from "./semantic/termination-overlap-detector.js";
import { detectUnreachableTerminations } from "./semantic/termination-reachability.js";

const warningRules = new Set([
  "action-precondition-unsatisfiable",
  "unused-variable",
  "unused-token-type",
  "unused-zone",
  "effect-value-out-of-bounds",
  "effect-amount-excessive",
  "termination-threshold-out-of-bounds",
  "termination-immediately-true",
  "zone-token-type-mismatch",
  "termination-overlap",
  "termination-variable-unmodified",
  "unused-action-param",
]);

const infoRules = new Set([
  "dominant-action",
  "free-lunch",
  "duplicate-action",
  "cancelling-effects",
  "redundant-set-effect",
]);

export const REPAIR_EXPECTED_RULES = new Set([
  "unused-variable",
  "unused-token-type",
  "unused-zone",
  "effect-value-out-of-bounds",
  "effect-amount-excessive",
  "termination-threshold-out-of-bounds",
  "termination-variable-unmodified",
  "zone-token-type-mismatch",
  "unused-action-param",
]);

export const UNREPAIRED_WARNING_RULES = new Set([
  "termination-immediately-true",
  "termination-overlap",
  "action-precondition-unsatisfiable",
]);

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

  process.stderr.write("[semantic] validateZoneTokenTypes\n");
  validateZoneTokenTypes(zones, tokenTypeIds, pushIssue);

  process.stderr.write("[semantic] validateTerminationBlock\n");
  const terminationConditions = validateTerminationBlock(definition, pushIssue);

  process.stderr.write("[semantic] validateNoLegalActionsPolicy\n");
  validateNoLegalActionsPolicy(definition, pushIssue);

  const allowedMetaIds = new Set(["legalActionCount", "hasLegalActions"]);
  process.stderr.write("[semantic] createRefValidator\n");
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

  process.stderr.write("[semantic] createSemanticValidators\n");
  const { validateSelector, validateEffect, validateExpr } = createSemanticValidators({
    validateRef,
    validateZoneRef,
    validateTokenTypeRef,
    validateVariableRef,
    joinPath,
    zoneById,
    variableById,
    pushIssue,
  });

  process.stderr.write("[semantic] validateActions\n");
  validateActions(definition, {
    validateExpr,
    validateEffect,
    validateSelector,
    evaluateExpr,
    exprEvalContext,
    pushIssue,
  });

  const actions = normalizeArray(definition.actions);
  process.stderr.write("[semantic] detectDuplicateActions\n");
  detectDuplicateActions(actions, pushIssue);
  process.stderr.write("[semantic] detectCancellingEffects\n");
  detectCancellingEffects(actions, pushIssue);
  process.stderr.write("[semantic] detectUnusedParams\n");
  detectUnusedParams(actions, pushIssue);

  process.stderr.write("[semantic] validateTriggers\n");
  validateTriggers(normalizeArray(definition.triggers), "/triggers", { validateExpr, validateEffect });
  validateTriggers(normalizeArray(definition.turn?.stepEffects), "/turn/stepEffects", { validateExpr, validateEffect });

  process.stderr.write("[semantic] validateScheduler\n");
  validateScheduler(definition, { variableIds, tokenTypeIds, zoneIds, pushIssue });

  process.stderr.write("[semantic] validateTerminationExpressions\n");
  validateTerminationExpressions(terminationConditions, definition, validateExpr);

  process.stderr.write("[semantic] validateTerminationThresholds\n");
  validateTerminationThresholds(terminationConditions, variableById, pushIssue);

  process.stderr.write("[semantic] detectOverlappingTerminations\n");
  detectOverlappingTerminations(terminationConditions, variableById, pushIssue);

  process.stderr.write("[semantic] detectUnreachableTerminations\n");
  detectUnreachableTerminations(terminationConditions, definition, pushIssue);

  process.stderr.write("[semantic] reportUnusedResources\n");
  reportUnusedResources({
    variableIds,
    tokenTypeIds,
    zoneIds,
    usedVariableIds,
    usedTokenTypeIds,
    usedZoneIds,
    pushIssue,
  });

  process.stderr.write("[semantic] done\n");
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
