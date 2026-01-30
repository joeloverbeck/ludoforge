/**
 * Property-based semantic naming for evolved game elements.
 *
 * Inspects element composition and generates meaningful IDs instead of
 * appending "-variant" suffixes that compound over generations.
 */

// ── Action naming ──────────────────────────────────────────────────────

/** Maps single effect kinds to verb names. */
const SINGLE_EFFECT_VERBS = {
  inc: "boost",
  dec: "drain",
  set: "set",
  move: "shift",
  spawn: "summon",
  destroy: "banish",
  reveal: "unveil",
  hide: "cloak",
  move_spatial: "traverse",
  repeat: "volley",
  set_flag: "mark",
};

/**
 * Maps multi-effect kind combinations (sorted, joined with "+") to verbs.
 * Only the most common combos are listed; unknown combos fall through to
 * a concatenation strategy.
 */
const MULTI_EFFECT_VERBS = {
  "inc+move": "charge",
  "dec+move": "retreat",
  "dec+destroy": "raze",
  "inc+spawn": "rally",
  "inc+dec": "trade",
  "move+spawn": "deploy",
  "destroy+spawn": "transform",
  "inc+inc": "surge",
  "dec+dec": "collapse",
  "move+move": "swap",
  "hide+move": "sneak",
  "inc+reveal": "discover",
  "destroy+move": "strike",
  "inc+set_flag": "empower",
  "dec+set_flag": "weaken",
  "inc+destroy": "conquer",
  "move+reveal": "scout",
  "hide+destroy": "ambush",
  "set+move": "assign",
  "set+spawn": "conjure",
};

/** Actor-based adjective prefixes. */
const ACTOR_PREFIXES = {
  system: "auto",
  reaction: "swift",
};

/**
 * Derive an action name from its effects and actor.
 * @param {object} action - The action object (without id).
 * @returns {string}
 */
function nameAction(action) {
  const effects = Array.isArray(action?.effects) ? action.effects : [];
  const kinds = effects
    .map((e) => (typeof e?.kind === "string" ? e.kind : null))
    .filter(Boolean);

  let verb;
  if (kinds.length === 0) {
    verb = "act";
  } else if (kinds.length === 1) {
    verb = SINGLE_EFFECT_VERBS[kinds[0]] ?? "act";
  } else {
    const sorted = [...kinds].sort();
    const key = sorted.join("+");
    verb = MULTI_EFFECT_VERBS[key] ?? null;
    if (verb === null) {
      // Fallback: use first two distinct kinds
      const distinct = [...new Set(kinds)].sort();
      const fallbackKey = distinct.slice(0, 2).join("+");
      verb = MULTI_EFFECT_VERBS[fallbackKey] ?? SINGLE_EFFECT_VERBS[distinct[0]] ?? "act";
    }
  }

  const actor = typeof action?.actor === "string" ? action.actor : "";
  const prefix = ACTOR_PREFIXES[actor] ?? "";
  return prefix ? `${prefix}-${verb}` : verb;
}

// ── Zone naming ────────────────────────────────────────────────────────

/**
 * Maps zone property signatures to terrain words.
 * Key format: `${scope}:${order}:${visibility}:${hasSpatial}`
 */
const ZONE_NAMES = {
  "global:ordered:public:false": "lane",
  "global:ordered:public:true": "path",
  "global:ordered:private:false": "vault",
  "global:ordered:private:true": "tunnel",
  "global:unordered:public:false": "field",
  "global:unordered:public:true": "arena",
  "global:unordered:private:false": "cache",
  "global:unordered:private:true": "maze",
  "per_player:ordered:public:false": "row",
  "per_player:ordered:public:true": "trail",
  "per_player:ordered:private:false": "stash",
  "per_player:ordered:private:true": "passage",
  "per_player:unordered:public:false": "pool",
  "per_player:unordered:public:true": "garden",
  "per_player:unordered:private:false": "hand",
  "per_player:unordered:private:true": "den",
};

/**
 * Derive a zone name from its properties.
 * @param {object} zone - The zone object (without id).
 * @returns {string}
 */
function nameZone(zone) {
  const scope = zone?.scope ?? "global";
  const order = zone?.order ?? "unordered";
  const visibility = zone?.visibility ?? "public";
  const hasSpatial = Boolean(zone?.spatial?.nodes?.length > 0);
  const key = `${scope}:${order}:${visibility}:${hasSpatial}`;
  return ZONE_NAMES[key] ?? "zone";
}

// ── Token naming ───────────────────────────────────────────────────────

/**
 * Derive a token name from its attribute count.
 * @param {object} tokenType - The token type object (without id).
 * @returns {string}
 */
function nameToken(tokenType) {
  const attrs = Array.isArray(tokenType?.attributes) ? tokenType.attributes : [];
  const count = attrs.length;
  if (count === 0) return "marker";
  if (count === 1) return "counter";
  if (count === 2) return "piece";
  return "hero";
}

// ── Target naming ──────────────────────────────────────────────────────

const TARGET_NAMES = {
  token: "pick",
  player: "chooser",
  zone: "area",
};

/**
 * Derive a target name from its kind.
 * @param {object} target - The target object (without id).
 * @returns {string}
 */
function nameTarget(target) {
  const kind = typeof target?.kind === "string" ? target.kind : "";
  return TARGET_NAMES[kind] ?? "target";
}

// ── Variable naming ────────────────────────────────────────────────

const VARIABLE_NAMES = [
  "tally", "score", "gauge", "meter", "count",
  "points", "level", "rank", "power", "energy",
  "health", "supply",
];

/**
 * Derive a variable name from a pool of semantic words.
 * @param {Set<string>} existingIds - Set of existing variable IDs.
 * @returns {string}
 */
function nameVariable(existingIds) {
  for (const name of VARIABLE_NAMES) {
    if (!existingIds.has(`${name}-1`)) {
      return name;
    }
  }
  return "variable";
}

// ── Phase naming ───────────────────────────────────────────────────────

const PHASE_ORDINALS = [
  "dawn", "morning", "midday", "afternoon", "dusk",
  "evening", "twilight", "night", "midnight", "witching",
  "wee-hours", "predawn",
];

/**
 * Derive a phase name from the count of existing phases.
 * @param {Set<string>} existingIds - Set of existing phase IDs.
 * @returns {string}
 */
function namePhase(existingIds) {
  for (const name of PHASE_ORDINALS) {
    if (!existingIds.has(`${name}-1`)) {
      return name;
    }
  }
  // All ordinals taken, fall back to numbered phases
  return "phase";
}

// ── Collision resolution ───────────────────────────────────────────────

/**
 * Always append a numeric suffix: baseName-1, baseName-2, baseName-3, etc.
 * @param {string} baseName
 * @param {Set<string>} existingIds
 * @returns {string}
 */
function ensureUnique(baseName, existingIds) {
  let counter = 1;
  while (existingIds.has(`${baseName}-${counter}`)) {
    counter += 1;
  }
  return `${baseName}-${counter}`;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Generate a meaningful, unique ID for a game element based on its properties.
 *
 * @param {"action"|"zone"|"token"|"target"|"phase"} elementType
 * @param {object|null} elementData - The element object (null for phases).
 * @param {Set<string>} existingIds - Set of IDs already in use.
 * @returns {string} A unique semantic ID.
 */
export function generateSemanticId(elementType, elementData, existingIds) {
  const ids = existingIds instanceof Set ? existingIds : new Set();

  let baseName;
  switch (elementType) {
    case "action":
      baseName = nameAction(elementData);
      break;
    case "zone":
      baseName = nameZone(elementData);
      break;
    case "token":
      baseName = nameToken(elementData);
      break;
    case "target":
      baseName = nameTarget(elementData);
      break;
    case "variable":
      baseName = nameVariable(ids);
      break;
    case "phase":
      baseName = namePhase(ids);
      break;
    default:
      baseName = elementType ?? "element";
  }

  return ensureUnique(baseName, ids);
}
