export const EXISTING_POST_OPTIMIZATION_PROMPT_MAX_BYTES = 320 * 1024;
export const EXISTING_POST_RESEARCH_PROMPT_MAX_BYTES = 12 * 1024;

export function promptInputError(message) {
  return Object.assign(new TypeError(message), {
    code: 'CONTENT_EXISTING_POST_PROMPT_INPUT_INVALID',
    providerRequestStarted: false
  });
}

export function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw promptInputError(`${label} muss ein Objekt sein.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw promptInputError(`${label} muss ein einfaches Objekt sein.`);
  }
  return value;
}

export function exactString(value, label, maximum, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string') {
    throw promptInputError(`${label} muss Text sein.`);
  }
  if (value.length > maximum) {
    throw promptInputError(`${label} überschreitet die zulässige Länge.`);
  }
  return value;
}

export function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw promptInputError(`${label} muss eine endliche Zahl sein.`);
  }
  return value;
}

export function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw promptInputError(`${label} muss eine positive Ganzzahl sein.`);
  }
  return value;
}

export function exactBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw promptInputError(`${label} muss ein boolescher Wert sein.`);
  }
  return value;
}

export function validatedList(value, label, outputMaximum, mapper, inputMaximum = 5_000) {
  if (!Array.isArray(value)) {
    throw promptInputError(`${label} muss eine Liste sein.`);
  }
  if (value.length > inputMaximum) {
    throw promptInputError(`${label} enthält zu viele Einträge.`);
  }
  const validated = value.map(mapper);
  return validated.slice(0, outputMaximum);
}

export function exactList(value, label, maximum, mapper) {
  if (!Array.isArray(value)) {
    throw promptInputError(`${label} muss eine Liste sein.`);
  }
  if (value.length > maximum) {
    throw promptInputError(`${label} enthält zu viele Einträge.`);
  }
  return value.map(mapper);
}

export function stringifyPromptInput(value, maximumBytes, label) {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
    throw promptInputError(`${label} überschreitet die zulässige Gesamtgröße.`);
  }
  return serialized;
}
