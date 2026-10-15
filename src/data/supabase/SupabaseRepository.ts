import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodType, ZodTypeDef } from 'zod'
import type { Repository } from '@/data/repositories'
import type { BaseRecord, NewRecord } from '@/types'
import { friendlyError, patchToRow, rowToRecord } from './mapping'
import type { HouseholdScope } from './scope'

type Row = Record<string, unknown>

/** CRUD against one Postgres table. Every row is tied to the current household. */
export class SupabaseRepository<T extends BaseRecord> implements Repository<T> {
  constructor(
    protected readonly client: SupabaseClient,
    protected readonly table: string,
    protected readonly scope: HouseholdScope,
    protected readonly schema: ZodType<T, ZodTypeDef, unknown>,
  ) {}

  /** Validates a row from the database. A row that doesn't fit the schema is reported, not trusted. */
  protected parse(row: Row): T {
    const result = this.schema.safeParse(rowToRecord(row))
    if (!result.success) {
      console.warn(`[${this.table}] unexpected row`, result.error.issues)
      throw new Error('The server sent data this app does not understand.')
    }
    return result.data
  }

  /** Same, but skips a bad row instead of failing the whole list. */
  protected parseAll(rows: Row[]): T[] {
    return rows.flatMap((row) => {
      const result = this.schema.safeParse(rowToRecord(row))
      if (result.success) return [result.data]
      console.warn(`[${this.table}] skipped an unexpected row`, result.error.issues)
      return []
    })
  }

  async list(): Promise<T[]> {
    const householdId = await this.scope.householdId()
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('household_id', householdId)
    if (error) throw friendlyError(error)
    return this.parseAll((data ?? []) as Row[])
  }

  async get(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw friendlyError(error)
    return data ? this.parse(data as Row) : null
  }

  async create(input: NewRecord<T>): Promise<T> {
    const householdId = await this.scope.householdId()
    const { data, error } = await this.client
      .from(this.table)
      .insert({ ...patchToRow(input as Row), household_id: householdId })
      .select('*')
      .single()
    if (error) throw friendlyError(error)
    return this.parse(data as Row)
  }

  async update(id: string, patch: Partial<NewRecord<T>>): Promise<T> {
    const { data, error } = await this.client
      .from(this.table)
      .update(patchToRow(patch as Row))
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw friendlyError(error)
    return this.parse(data as Row)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq('id', id)
    if (error) throw friendlyError(error)
  }

  /** All rows where `column` equals `value`. */
  protected async listWhere(column: string, value: string): Promise<T[]> {
    const { data, error } = await this.client.from(this.table).select('*').eq(column, value)
    if (error) throw friendlyError(error)
    return this.parseAll((data ?? []) as Row[])
  }

  protected async findWhere(column: string, value: string): Promise<T | null> {
    const householdId = await this.scope.householdId()
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('household_id', householdId)
      .eq(column, value)
      .maybeSingle()
    if (error) throw friendlyError(error)
    return data ? this.parse(data as Row) : null
  }

  protected async removeWhere(column: string, value: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq(column, value)
    if (error) throw friendlyError(error)
  }
}
