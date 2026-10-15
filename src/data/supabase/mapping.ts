/**
 * The app uses camelCase records; Postgres uses snake_case columns. Only TOP-LEVEL keys are
 * converted: values (like the `ratings` object keyed by member id) are never touched.
 */
export const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
export const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/** Keys the database owns. The app never writes them. */
const SERVER_OWNED = new Set(['id', 'createdAt', 'updatedAt', 'syncStatus', 'householdId'])

/** A database row to an app record: camelCase keys, `null` becomes missing, and it is marked synced. */
export function rowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [column, value] of Object.entries(row)) {
    if (column === 'household_id') continue
    if (value === null) continue
    record[snakeToCamel(column)] = value
  }
  record.syncStatus = 'synced'
  return record
}

/**
 * App fields to database columns. A key that is present but `undefined` is sent as `null`,
 * so clearing a field (like removing a rating) really clears it.
 */
export function patchToRow(patch: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (SERVER_OWNED.has(key)) continue
    row[camelToSnake(key)] = value === undefined ? null : value
  }
  return row
}

/** Turns a Supabase/Postgres error into a sentence a person can act on. */
export function friendlyError(error: { message: string; code?: string }): Error {
  switch (error.code) {
    case '23505':
      return new Error('That already exists.')
    case '23503':
      return new Error('That is linked to something that no longer exists. Refresh and try again.')
    case '42501':
      return new Error("You don't have permission to do that.")
    case 'PGRST301':
    case 'PGRST303':
      return new Error('Your session expired. Please sign in again.')
    case 'PGRST116':
      return new Error('That record was not found.')
    default:
      return new Error(error.message || 'Something went wrong talking to the server.')
  }
}
