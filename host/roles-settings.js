// dsh-crew role-model settings (HOST/AGENT bridge).
//
// The browser Settings card and the crew role tools share this namespace. The
// settings provider is optional: without one, the legacy roleModels composition
// entry remains the runtime fallback, which keeps non-Web profiles working.

import { createRequire } from "node:module";

/**
 * dsh installs Schemastery with the plugin, but the repository's plain QA copy
 * deliberately has no node_modules. Keep role-preset's legacy mount testable in
 * that copy while using the real schema library whenever the host provides it.
 */
function fallbackClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function fallbackSchema(parse, json) {
  const schema = (value) => parse(value);
  schema.toJSON = () => fallbackClone(json);
  schema.default = (value) => fallbackSchema(
    (input) => input === undefined ? fallbackClone(value) : schema(input),
    { ...json, default: fallbackClone(value) },
  );
  schema.required = () => fallbackSchema(
    (input) => input === undefined ? (() => { throw new TypeError("value is required"); })() : schema(input),
    { ...json, required: true },
  );
  return schema;
}

function fallbackString() {
  return fallbackSchema((value) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new TypeError("expected a string");
    return value;
  }, { type: "string" });
}

function fallbackObject(shape) {
  return fallbackSchema((value) => {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("expected an object");
    return Object.fromEntries(Object.entries(shape).flatMap(([key, field]) => {
      const parsed = field(value[key]);
      return parsed === undefined ? [] : [[key, parsed]];
    }));
  }, { type: "object", properties: Object.fromEntries(Object.entries(shape).map(([key, field]) => [key, field.toJSON()])) });
}

function fallbackDict(field) {
  return fallbackSchema((value) => {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("expected a dictionary");
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)]));
  }, { type: "object", additionalProperties: field.toJSON() });
}

function loadSchemaLibrary() {
  try {
    return createRequire(import.meta.url)("@deepseek-ai/schemastery");
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND" || !String(error.message ?? "").includes("@deepseek-ai/schemastery")) throw error;
    return { string: fallbackString, object: fallbackObject, dict: fallbackDict };
  }
}

const z = loadSchemaLibrary();

/** Durable settings namespace owned by the crew role-tools plugin. */
export const CREW_SETTINGS_NAMESPACE = "dsh-crew-roles";

/**
 * A route is intentionally string-shaped rather than an enum. Provider/model
 * catalogs are live and adapter-owned, so a route that disappears must remain
 * stored and visible as unavailable instead of being rejected or rewritten.
 */
const ROLE_MODEL_SCHEMA = z.object({
  provider: z.string().default(""),
  model: z.string().default(""),
  reasoningEffort: z.string(),
});

/** Settings wire schema for the role-model overrides. */
export const CREW_SETTINGS_SCHEMA = z.object({
  roleModels: z.dict(ROLE_MODEL_SCHEMA).default({}),
});

const UNSAFE_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const hasOwn = (value, key) => value !== null
  && (typeof value === "object" || typeof value === "function")
  && Object.prototype.hasOwnProperty.call(value, key);

/** Copy own record fields onto a null-prototype object without invoking setters. */
function cloneRecord(value) {
  const result = Object.create(null);
  for (const key of Object.keys(value)) {
    if (UNSAFE_RECORD_KEYS.has(key)) continue;
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      value: value[key],
      writable: true,
    });
  }
  return result;
}

/** Clone the route map without inventing or deleting unavailable identifiers. */
export function cloneRoleModels(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return Object.create(null);
  const result = Object.create(null);
  for (const key of Object.keys(value)) {
    if (UNSAFE_RECORD_KEYS.has(key)) continue;
    const route = value[key];
    if (route === null || typeof route !== "object" || Array.isArray(route)) {
      throw new TypeError(`dsh-crew: roleModels.${key} must be an object route`);
    }
    for (const field of ["provider", "model", "reasoningEffort"]) {
      if (hasOwn(route, field) && typeof route[field] !== "string") {
        throw new TypeError(`dsh-crew: roleModels.${key}.${field} must be a string`);
      }
    }
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      value: cloneRecord(route),
      writable: true,
    });
  }
  return result;
}

/** Read one role route only when it is an own settings entry. */
export function roleModelFor(roleModels, roleKey) {
  return hasOwn(roleModels, roleKey) ? roleModels[roleKey] : undefined;
}

/**
 * Project one stored role route onto tool-subagent's AgentOptions.
 *
 * An absent/empty model is inheritance, not an empty AgentOptions object. An
 * effort is emitted only with that role's own model route, so a stale effort
 * cannot accidentally replace the PM/session effort while the role inherits.
 */
export function roleAgentOptions(route) {
  if (route === null || typeof route !== "object" || Array.isArray(route)) return undefined;
  const model = hasOwn(route, "model") ? route.model : undefined;
  const provider = hasOwn(route, "provider") ? route.provider : undefined;
  const reasoningEffort = hasOwn(route, "reasoningEffort") ? route.reasoningEffort : undefined;
  if (typeof model !== "string" || model.length === 0) return undefined;

  return {
    ...typeof provider === "string" && provider.length > 0
      ? { provider }
      : {},
    model,
    ...typeof reasoningEffort === "string" && reasoningEffort.length > 0
      ? { reasoningEffort }
      : {},
  };
}

/** Build the composition entry used as the legacy fallback layer. */
export function crewSettingsEntry(config) {
  return { roleModels: cloneRoleModels(config?.roleModels) };
}
