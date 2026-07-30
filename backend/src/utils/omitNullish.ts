/**
 * Drop null/undefined keys so partial Excel import updates do not wipe existing DB fields.
 * Empty string is preserved (caller may intentionally clear text fields).
 */
export function omitNullish<T extends Record<string, unknown>>(
  input: T | null | undefined
): Partial<T> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const out: Partial<T> = {};
  for (const key of Object.keys(input) as Array<keyof T>) {
    const value = input[key];
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
