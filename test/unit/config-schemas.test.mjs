import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const sharedSchemaJson = JSON.parse(
  await readFile(
    new URL("../../schemas/shared/metric-id.schema.json", import.meta.url),
  ),
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(sharedSchemaJson);

const entries = [
  {
    name: "simulation",
    schema: "simulation.schema.json",
    config: "simulation.json",
  },
  {
    name: "metrics-core",
    schema: "metrics-core.schema.json",
    config: "metrics-core.json",
  },
  {
    name: "metrics-extended",
    schema: "metrics-extended.schema.json",
    config: "metrics-extended.json",
  },
  {
    name: "degeneracy",
    schema: "degeneracy.schema.json",
    config: "degeneracy.json",
  },
  {
    name: "fitness",
    schema: "fitness.schema.json",
    config: "fitness.json",
  },
  {
    name: "preference-model",
    schema: "preference-model.schema.json",
    config: "preference-model.json",
  },
  {
    name: "active-learning",
    schema: "active-learning.schema.json",
    config: "active-learning.json",
  },
  {
    name: "map-elites",
    schema: "map-elites.schema.json",
    config: "map-elites.json",
  },
  {
    name: "evolution-operators",
    schema: "evolution-operators.schema.json",
    config: "evolution-operators.json",
  },
  {
    name: "evolution-runner",
    schema: "evolution-runner.schema.json",
    config: "evolution-runner.json",
  },
  {
    name: "human-feedback",
    schema: "human-feedback.schema.json",
    config: "human-feedback.json",
  },
];

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("config-schemas", () => {
  describe("schema acceptance", () => {
    for (const entry of entries) {
      it(`config schema accepts ${entry.name}`, async () => {
        const schemaJson = await readJson(`../../schemas/config/${entry.schema}`);
        const configJson = await readJson(`../../configs/${entry.config}`);
        const validate = ajv.compile(schemaJson);
        const ok = validate(configJson);
        assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
      });
    }
  });

  describe("schema rejection", () => {
    function freshAjv() {
      const instance = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
      instance.addSchema(sharedSchemaJson);
      return instance;
    }

    it("simulation schema rejects invalid maxTurns", async () => {
      const schemaJson = await readJson("../../schemas/config/simulation.schema.json");
      const configJson = await readJson("../../configs/simulation.json");
      const candidate = structuredClone(configJson);
      candidate.maxTurns = "nope";
      const validate = freshAjv().compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema validation to fail");
    });

    it("evolution-operators schema rejects unknown mutation operator in enabled", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const configJson = await readJson("../../configs/evolution-operators.json");
      const candidate = structuredClone(configJson);
      candidate.mutation.enabled.push("bogus-operator");
      const validate = freshAjv().compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema to reject unknown mutation operator");
    });

    it("evolution-operators schema rejects unknown key in mutation weights", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const configJson = await readJson("../../configs/evolution-operators.json");
      const candidate = structuredClone(configJson);
      candidate.mutation.weights = { ...candidate.mutation.weights, "typo-op": 1 };
      const validate = freshAjv().compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema to reject unknown weight key");
    });

    it("evolution-operators schema rejects unknown crossover operator", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const configJson = await readJson("../../configs/evolution-operators.json");
      const candidate = structuredClone(configJson);
      candidate.crossover.enabled.push("bad-crossover");
      const validate = freshAjv().compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema to reject unknown crossover operator");
    });

    it("evolution-operators schema rejects unknown repair operator", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const configJson = await readJson("../../configs/evolution-operators.json");
      const candidate = structuredClone(configJson);
      candidate.repair.enabled.push("bad-repair");
      const validate = freshAjv().compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema to reject unknown repair operator");
    });
  });

  describe("evolution-operators enum completeness", () => {
    it("mutation enum contains all 14 existing operator kinds", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const mutationEnum = schemaJson.$defs.MutationOperatorKind.enum;
      const existing = [
        "numeric-tweak",
        "boolean-toggle",
        "enum-cycle",
        "action-duplicate",
        "action-remove",
        "action-effect-magnitude",
        "precondition-negation",
        "termination-threshold",
        "termination-outcome",
        "phase-add",
        "phase-remove",
        "token-zone-target-add",
        "token-type-remove",
        "zone-remove",
      ];
      for (const op of existing) {
        assert.ok(mutationEnum.includes(op), `Missing existing operator: ${op}`);
      }
    });

    it("mutation enum contains all 7 new effect-level operator kinds", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const mutationEnum = schemaJson.$defs.MutationOperatorKind.enum;
      const newOps = [
        "effect-insert",
        "effect-delete",
        "effect-param-tweak",
        "effect-kind-swap",
        "effect-reorder",
        "action-add-small",
        "motif-inject",
      ];
      for (const op of newOps) {
        assert.ok(mutationEnum.includes(op), `Missing new operator: ${op}`);
      }
    });

    it("crossover enum contains subtree-swap", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const crossoverEnum = schemaJson.$defs.CrossoverOperatorKind.enum;
      assert.ok(crossoverEnum.includes("subtree-swap"), "Missing subtree-swap");
    });

    it("repair enum contains dsl-safety", async () => {
      const schemaJson = await readJson(
        "../../schemas/config/evolution-operators.schema.json",
      );
      const repairEnum = schemaJson.$defs.RepairOperatorKind.enum;
      assert.ok(repairEnum.includes("dsl-safety"), "Missing dsl-safety");
    });
  });
});
