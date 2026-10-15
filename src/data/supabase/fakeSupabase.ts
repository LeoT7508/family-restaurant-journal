import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null }

/** A tiny in-memory stand-in for the parts of the Supabase client the app uses. Test-only. */
export class FakeSupabase {
  tables: Record<string, Row[]> = {}
  unique: Record<string, string[]> = {}
  session: { user: { id: string; email: string; identities?: unknown[] } } | null = null
  rpcCalls: { name: string; args: unknown }[] = []
  rpcError: { message: string; code?: string } | null = null
  authError: { message: string } | null = null
  signUpResult: { session: unknown; user: { identities: unknown[] } } = {
    session: { access_token: 'x' },
    user: { identities: [{}] },
  }
  authCalls: { name: string; args: unknown }[] = []
  private authListeners: ((event: string) => void)[] = []
  uploads: { path: string; contentType?: string }[] = []
  removed: string[] = []
  private counter = 0

  nextId() {
    this.counter += 1
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`
  }

  /** Pretend Supabase fired an auth event (for example PASSWORD_RECOVERY). */
  emitAuthEvent(event: string) {
    for (const cb of this.authListeners) cb(event)
  }

  seed(table: string, rows: Row[]) {
    this.tables[table] = [...(this.tables[table] ?? []), ...rows]
  }

  from(table: string) {
    return new FakeQuery(this, table)
  }

  rpc(name: string, args: unknown) {
    this.rpcCalls.push({ name, args })
    return Promise.resolve({ data: null, error: this.rpcError })
  }

  auth = {
    getSession: async () => ({ data: { session: this.session } }),
    onAuthStateChange: (cb: (event: string) => void) => {
      this.authListeners.push(cb)
      return { data: { subscription: { unsubscribe() {} } } }
    },
    resend: async (args: unknown) => {
      this.authCalls.push({ name: 'resend', args })
      return { error: this.authError }
    },
    resetPasswordForEmail: async (email: string, opts: unknown) => {
      this.authCalls.push({ name: 'reset', args: { email, opts } })
      return { error: this.authError }
    },
    updateUser: async (args: unknown) => {
      this.authCalls.push({ name: 'updateUser', args })
      return { error: this.authError }
    },
    signInWithPassword: async () => ({ data: {}, error: this.authError }),
    signUp: async (args: unknown) => {
      this.authCalls.push({ name: 'signUp', args })
      return { data: this.signUpResult, error: this.authError }
    },
    signOut: async () => {
      this.session = null
      return { error: null }
    },
  }

  storage = {
    from: () => ({
      upload: async (path: string, _blob: unknown, opts?: { contentType?: string }) => {
        this.uploads.push({ path, contentType: opts?.contentType })
        return { data: { path }, error: null }
      },
      createSignedUrl: async (path: string, seconds: number) => ({
        data: { signedUrl: `https://signed.example/${path}?t=${seconds}` },
        error: null,
      }),
      remove: async (paths: string[]) => {
        this.removed.push(...paths)
        return { data: null, error: null }
      },
    }),
  }

  asClient() {
    return this as unknown as SupabaseClient
  }
}

class FakeQuery implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private filters: [string, unknown][] = []
  private payload: Row = {}
  private returning = false

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
  ) {}

  select() {
    if (this.op !== 'select') this.returning = true
    return this
  }
  insert(row: Row) {
    this.op = 'insert'
    this.payload = row
    return this
  }
  update(patch: Row) {
    this.op = 'update'
    this.payload = patch
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }
  maybeSingle() {
    return this.run('maybe')
  }
  single() {
    return this.run('single')
  }
  then<A, B>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    bad?: ((e: unknown) => B | PromiseLike<B>) | null,
  ) {
    return this.run('many').then(ok, bad)
  }

  private matches(row: Row) {
    return this.filters.every(([c, v]) => row[c] === v)
  }

  private async run(shape: 'many' | 'maybe' | 'single'): Promise<Result> {
    const rows = (this.db.tables[this.table] ??= [])
    let affected: Row[]

    if (this.op === 'insert') {
      const keys = this.db.unique[this.table]
      if (keys && rows.some((r) => keys.every((k) => r[k] === this.payload[k]))) {
        return { data: null, error: { message: 'duplicate key value', code: '23505' } }
      }
      const now = new Date().toISOString()
      const row = { id: this.db.nextId(), created_at: now, updated_at: now, ...this.payload }
      rows.push(row)
      affected = [row]
    } else if (this.op === 'update') {
      affected = rows.filter((r) => this.matches(r))
      for (const r of affected)
        Object.assign(r, this.payload, { updated_at: new Date().toISOString() })
    } else if (this.op === 'delete') {
      this.db.tables[this.table] = rows.filter((r) => !this.matches(r))
      return { data: null, error: null }
    } else {
      affected = rows.filter((r) => this.matches(r))
    }

    if ((this.op === 'insert' || this.op === 'update') && !this.returning)
      return { data: null, error: null }
    const copy = affected.map((r) => ({ ...r }))
    if (shape === 'many') return { data: copy, error: null }
    if (shape === 'maybe') return { data: copy[0] ?? null, error: null }
    return copy[0]
      ? { data: copy[0], error: null }
      : {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
          },
        }
  }
}
