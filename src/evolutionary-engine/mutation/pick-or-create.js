import { collectZoneTargets, collectTokenTypeTargets } from "./targets.js";
import { generateSemanticId } from "./semantic-naming.js";
import { DEFAULT_EVOLUTION_OPERATORS_CONFIG } from "../operator-config.js";

const SCOPES = ["global", "per_player"];
const ORDERS = ["ordered", "unordered"];
const VISIBILITIES = ["public", "private"];

const defaultCreateProbability =
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.pickOrCreate ?? {};

function getCreateProbability(elementType, options) {
  if (typeof options?.createProbability === "number") {
    return options.createProbability;
  }
  const defaults = {
    zone: defaultCreateProbability.zone ?? 0.1,
    tokenType: defaultCreateProbability.tokenType ?? 0.1,
    variable: defaultCreateProbability.variable ?? 0.15,
  };
  return defaults[elementType] ?? 0.1;
}

/**
 * Pick an existing zone or create a new one and inject it into `definition`.
 * The definition is mutated in place (caller already cloned it).
 *
 * @param {object} definition - mutable definition clone
 * @param {{ next(): number, nextInt(n: number): number }} rng
 * @param {{ createProbability?: number }} [options]
 * @returns {{ id: string } | null}
 */
export function pickOrCreateZone(definition, rng, options = {}) {
  const zones = collectZoneTargets(definition);
  const tokenTypes = collectTokenTypeTargets(definition);
  const prob = getCreateProbability("zone", options);

  const shouldCreate = zones.length === 0 || rng.next() < prob;

  if (shouldCreate && tokenTypes.length > 0) {
    const existingZoneIds = new Set(
      zones.map((z) => z.id).filter((id) => typeof id === "string"),
    );
    const tokenType = tokenTypes[rng.nextInt(tokenTypes.length)];
    const newZone = {
      tokenType: tokenType.id,
      scope: SCOPES[rng.nextInt(SCOPES.length)],
      order: ORDERS[rng.nextInt(ORDERS.length)],
      visibility: VISIBILITIES[rng.nextInt(VISIBILITIES.length)],
    };
    const newId = generateSemanticId("zone", newZone, existingZoneIds);
    const created = { ...newZone, id: newId };

    if (!definition.state) {
      definition.state = {};
    }
    definition.state.zones = [...zones, created];
    return created;
  }

  if (zones.length > 0) {
    return zones[rng.nextInt(zones.length)];
  }

  return null;
}

/**
 * Pick an existing token type or create a new one (with companion zone)
 * and inject into `definition`.
 *
 * @param {object} definition - mutable definition clone
 * @param {{ next(): number, nextInt(n: number): number }} rng
 * @param {{ createProbability?: number }} [options]
 * @returns {{ id: string } | null}
 */
export function pickOrCreateTokenType(definition, rng, options = {}) {
  const tokenTypes = collectTokenTypeTargets(definition);
  const zones = collectZoneTargets(definition);
  const prob = getCreateProbability("tokenType", options);

  const shouldCreate = tokenTypes.length === 0 || rng.next() < prob;

  if (shouldCreate) {
    const existingTokenIds = new Set(
      tokenTypes.map((t) => t.id).filter((id) => typeof id === "string"),
    );
    const existingZoneIds = new Set(
      zones.map((z) => z.id).filter((id) => typeof id === "string"),
    );

    const attrMax = 2 + rng.nextInt(9);
    const newTokenType = {
      attributes: [
        {
          id: "value",
          scope: "global",
          type: { kind: "int", min: 0, max: attrMax },
          initial: 0,
        },
      ],
    };
    const tokenTypeId = generateSemanticId("token", newTokenType, existingTokenIds);

    const companionZone = {
      tokenType: tokenTypeId,
      scope: SCOPES[rng.nextInt(SCOPES.length)],
      order: ORDERS[rng.nextInt(ORDERS.length)],
      visibility: VISIBILITIES[rng.nextInt(VISIBILITIES.length)],
    };
    const companionZoneId = generateSemanticId("zone", companionZone, existingZoneIds);

    if (!definition.state) {
      definition.state = {};
    }
    definition.state.tokenTypes = [
      ...tokenTypes,
      { ...newTokenType, id: tokenTypeId },
    ];
    definition.state.zones = [
      ...zones,
      { ...companionZone, id: companionZoneId },
    ];

    return { ...newTokenType, id: tokenTypeId };
  }

  if (tokenTypes.length > 0) {
    return tokenTypes[rng.nextInt(tokenTypes.length)];
  }

  return null;
}

/**
 * Pick an existing variable or create a new one and inject into `definition`.
 *
 * @param {object} definition - mutable definition clone
 * @param {{ next(): number, nextInt(n: number): number }} rng
 * @param {{ createProbability?: number, filter?: { kind?: string, scope?: string } }} [options]
 * @returns {{ id: string, scope: string, type: object, initial: * } | null}
 */
export function pickOrCreateVariable(definition, rng, options = {}) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];

  const filter = options.filter ?? {};
  const filtered = variables.filter((v) => {
    if (filter.kind && v.type?.kind !== filter.kind) return false;
    if (filter.scope && v.scope !== filter.scope) return false;
    return true;
  });

  const prob = getCreateProbability("variable", options);
  const shouldCreate = filtered.length === 0 || rng.next() < prob;

  if (shouldCreate) {
    const existingIds = new Set(variables.map((v) => v.id));
    const kind = filter.kind ?? "int";
    const scope = filter.scope ?? SCOPES[rng.nextInt(SCOPES.length)];

    let type;
    let initial;

    if (kind === "int") {
      const max = 1 + rng.nextInt(20);
      type = { kind: "int", min: 0, max };
      initial = 0;
    } else if (kind === "bool") {
      type = { kind: "bool" };
      initial = rng.nextInt(2) === 0;
    } else {
      type = { kind: "int", min: 0, max: 10 };
      initial = 0;
    }

    const id = generateSemanticId("variable", null, existingIds);
    const newVar = { id, scope, type, initial };

    if (!definition.state) {
      definition.state = {};
    }
    definition.state.variables = [...variables, newVar];
    return newVar;
  }

  if (filtered.length > 0) {
    return filtered[rng.nextInt(filtered.length)];
  }

  return null;
}
