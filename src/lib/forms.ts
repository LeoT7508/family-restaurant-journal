/** For `register(name, { setValueAs })` on number inputs: empty means "not given". */
export const numberOrUndefined = (v: unknown): number | undefined =>
  v === '' || v === null || v === undefined ? undefined : Number(v)
