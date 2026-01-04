import { vi } from 'vitest'

type SupabaseResponse<T> = { data: T; error: null }

const defaultListResponse: SupabaseResponse<any[]> = { data: [], error: null }
const defaultSingleResponse: SupabaseResponse<any> = { data: null, error: null }

type MockDb = {
  external_calendar_events: Array<Record<string, any>>
  external_calendar_connections: Array<Record<string, any>>
  bookings: Array<Record<string, any>>
  credit_ledger_entries: Array<Record<string, any>>
  payment_intents: Array<Record<string, any>>
  claimed_slot_ids: Set<string>
}

function getMockDb(): MockDb {
  const g = globalThis as any
  if (!g.__supabaseMockDb) {
    g.__supabaseMockDb = {
      external_calendar_events: [],
      external_calendar_connections: [],
      bookings: [],
      credit_ledger_entries: [],
      payment_intents: [],
      claimed_slot_ids: new Set<string>(),
    } satisfies MockDb
  }
  return g.__supabaseMockDb as MockDb
}

function resetMockDb() {
  const db = getMockDb()
  db.external_calendar_events = []
  db.external_calendar_connections = []
  db.bookings = []
  db.credit_ledger_entries = []
  db.payment_intents = []
  db.claimed_slot_ids = new Set<string>()
}

function isInsertErrorEnabled(table: string): boolean {
  const state = (globalThis as any).__supabaseMockState
  return Boolean(state?.insertErrors?.has?.(table))
}

function thenable<T>(value: T) {
  return {
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  }
}

function createQueryChain(defaultThenResult: SupabaseResponse<any> = defaultListResponse) {
  const chain: any = {}
  const selectFallback = vi.fn(() => {
    const eqChain: any = {
      data: [],
      error: null,
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      gte: vi.fn(() => ({
        data: [],
        error: null,
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null }))
        }))
      })),
      lte: vi.fn(() => eqChain),
      eq: vi.fn(() => eqChain),
      order: vi.fn(async () => ({ data: [], error: null }))
    }
    return {
      eq: vi.fn(() => eqChain),
      gte: vi.fn(async () => ({ data: [], error: null })),
      lte: vi.fn(async () => ({ data: [], error: null })),
      not: vi.fn(() => ({
        gte: vi.fn(async () => ({ data: [], error: null }))
      })),
      or: vi.fn(() => ({
        order: vi.fn(async () => ({ data: [], error: null })),
        gte: vi.fn(async () => ({ data: [], error: null }))
      })),
      order: vi.fn(async () => ({ data: [], error: null }))
    }
  })

  const deleteChain = vi.fn(() => {
    // Supabase query builder is thenable; many tests do:
    // await supabase.from('table').delete().neq('id', '')
    const deleteBuilder: any = {}
    deleteBuilder.select = vi.fn(() => deleteBuilder)
    deleteBuilder.eq = vi.fn(() => deleteBuilder)
    deleteBuilder.neq = vi.fn(() => deleteBuilder)
    deleteBuilder.in = vi.fn(() => deleteBuilder)
    deleteBuilder.or = vi.fn(() => deleteBuilder)
    deleteBuilder.then = vi.fn((resolve, reject) =>
      Promise.resolve({ data: null, error: null }).then(resolve, reject)
    )
    return deleteBuilder
  })

  chain.select = selectFallback
  chain.insert = vi.fn(() => chain)
  chain.upsert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = deleteChain
  chain.eq = vi.fn(() => chain)
  chain.neq = vi.fn(() => chain)
  chain.or = vi.fn(() => chain)
  chain.gte = vi.fn(() => chain)
  chain.lte = vi.fn(() => chain)
  chain.ilike = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.range = vi.fn(async () => defaultListResponse)
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn(async () => defaultSingleResponse)
  chain.maybeSingle = vi.fn(async () => defaultSingleResponse)
  chain.then = vi.fn((resolve) => resolve(defaultThenResult))
  return chain
}

export function createMockSupabaseClient() {
  // Track query state for availability_slots lookup
  let slotQueryState: {
    providerId?: string
    startTime?: string
    endTime?: string
    isAvailable?: boolean
  } = {}

  const buildFromChain = (table: string) => {
    const readChain = createQueryChain(defaultListResponse)
    const mutationChain = createQueryChain(defaultSingleResponse)

    const insertResult = isInsertErrorEnabled(table)
      ? ({ data: null, error: { message: 'forced insert error' } } as any)
      : ({ data: { id: 'insert-id' }, error: null } as any)

    const upsertResult = isInsertErrorEnabled(table)
      ? ({ data: null, error: { message: 'forced upsert error' } } as any)
      : ({ data: { id: 'upsert-id' }, error: null } as any)

    const insertBuilder = {
      select: vi.fn(() => ({
        single: vi.fn(async () => insertResult),
        maybeSingle: vi.fn(async () => insertResult),
      })),
      single: vi.fn(async () => insertResult),
      ...thenable(insertResult),
    }

    const upsertBuilder = {
      select: vi.fn(() => ({
        single: vi.fn(async () => upsertResult),
        maybeSingle: vi.fn(async () => upsertResult),
      })),
      single: vi.fn(async () => upsertResult),
      ...thenable(upsertResult),
    }

    // --- Stateful in-memory tables (used by "integration" tests that exercise repository logic) ---
    if (table === 'profiles') {
      const queryState: { filters: Array<{ column: string; value: any }> } = { filters: [] }

      const resolveRow = () => {
        const byAuth = queryState.filters.find((f) => f.column === 'auth_user_id')?.value
        const byId = queryState.filters.find((f) => f.column === 'id')?.value
        const role = queryState.filters.find((f) => f.column === 'role')?.value

        const authUserId = (byAuth ?? null) as string | null
        const id = (byId ?? (authUserId ? `profile-${authUserId}` : null)) as string | null

        if (!id) return null

        return {
          id,
          auth_user_id: authUserId,
          role: role ?? 'customer',
        }
      }

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ column, value })
        return tableChain
      })
      tableChain.maybeSingle = vi.fn(async () => ({ data: resolveRow(), error: null }))
      tableChain.single = vi.fn(async () => {
        const row = resolveRow()
        return { data: row, error: row ? null : { message: 'not found' } }
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: resolveRow() ? [resolveRow()] : [], error: null }).then(resolve, reject)
      )
      return tableChain
    }

    if (table === 'external_calendar_events') {
      const db = getMockDb()

      const queryState: {
        filters: Array<{ op: 'eq' | 'neq' | 'gte' | 'lte'; column: string; value: any }>
        orderBy?: { column: string; ascending: boolean }
        insertPayload?: any
        updatePayload?: any
      } = { filters: [] }

      const applyFilters = (rows: Array<Record<string, any>>) => {
        return rows.filter((row) => {
          return queryState.filters.every((f) => {
            const v = row[f.column]
            if (f.op === 'eq') return v === f.value
            if (f.op === 'neq') return v !== f.value
            if (f.op === 'gte') return String(v) >= String(f.value)
            if (f.op === 'lte') return String(v) <= String(f.value)
            return true
          })
        })
      }

      const selectResult = () => {
        let rows = applyFilters(db.external_calendar_events)
        if (queryState.orderBy) {
          const { column, ascending } = queryState.orderBy
          rows = [...rows].sort((a, b) => {
            const av = String(a[column])
            const bv = String(b[column])
            if (av === bv) return 0
            return ascending ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
          })
        }
        return rows
      }

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'eq', column, value })
        return tableChain
      })
      tableChain.neq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'neq', column, value })
        return tableChain
      })
      tableChain.gte = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'gte', column, value })
        return tableChain
      })
      tableChain.lte = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'lte', column, value })
        return tableChain
      })
      tableChain.order = vi.fn((column: string, options?: { ascending?: boolean }) => {
        queryState.orderBy = { column, ascending: options?.ascending !== false }
        return tableChain
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: selectResult(), error: null }).then(resolve, reject)
      )
      tableChain.maybeSingle = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.single = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })

      tableChain.insert = vi.fn((payload: any) => {
        queryState.insertPayload = payload
        const inserted = {
          id: (globalThis as any).crypto?.randomUUID?.() ?? `mock-${Date.now()}`,
          ...payload,
        }
        db.external_calendar_events.push(inserted)
        const insertChain: any = {}
        insertChain.select = vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: inserted, error: null })),
          single: vi.fn(async () => ({ data: inserted, error: null })),
        }))
        insertChain.maybeSingle = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.single = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.then = vi.fn((resolve, reject) =>
          Promise.resolve({ data: inserted, error: null }).then(resolve, reject)
        )
        return insertChain
      })

      tableChain.update = vi.fn((payload: any) => {
        queryState.updatePayload = payload
        const updateChain: any = {}
        updateChain.eq = vi.fn((column: string, value: any) => {
          // Only support eq('id', ...)
          if (column === 'id') {
            const idx = db.external_calendar_events.findIndex((r) => r.id === value)
            if (idx >= 0) {
              db.external_calendar_events[idx] = { ...db.external_calendar_events[idx], ...payload }
            }
          }
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                const row =
                  column === 'id'
                    ? db.external_calendar_events.find((r) => r.id === value) ?? null
                    : null
                return { data: row, error: null }
              }),
              single: vi.fn(async () => {
                const row =
                  column === 'id'
                    ? db.external_calendar_events.find((r) => r.id === value) ?? null
                    : null
                return { data: row, error: null }
              }),
            })),
          }
        })
        return updateChain
      })

      tableChain.delete = vi.fn(() => {
        const deleteChain: any = {}
        deleteChain.eq = vi.fn((column: string, value: any) => {
          // accumulate on tableChain's filters for simplicity
          queryState.filters.push({ op: 'eq', column, value })
          return deleteChain
        })
        deleteChain.neq = vi.fn((column: string, value: any) => {
          queryState.filters.push({ op: 'neq', column, value })
          return deleteChain
        })
        deleteChain.then = vi.fn((resolve, reject) => {
          const toDelete = applyFilters(db.external_calendar_events).map((r) => r.id)
          db.external_calendar_events = db.external_calendar_events.filter((r) => !toDelete.includes(r.id))
          return Promise.resolve({ data: null, error: null }).then(resolve, reject)
        })
        return deleteChain
      })

      return tableChain
    }

    if (table === 'external_calendar_connections') {
      const db = getMockDb()

      const queryState: {
        filters: Array<{ op: 'eq' | 'neq'; column: string; value: any }>
        insertPayload?: any
        updatePayload?: any
      } = { filters: [] }

      const applyFilters = (rows: Array<Record<string, any>>) => {
        return rows.filter((row) =>
          queryState.filters.every((f) => {
            const v = row[f.column]
            if (f.op === 'eq') return v === f.value
            if (f.op === 'neq') return v !== f.value
            return true
          })
        )
      }

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'eq', column, value })
        return tableChain
      })
      tableChain.neq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'neq', column, value })
        return tableChain
      })
      tableChain.maybeSingle = vi.fn(async () => {
        const rows = applyFilters(db.external_calendar_connections)
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.single = vi.fn(async () => {
        const rows = applyFilters(db.external_calendar_connections)
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: applyFilters(db.external_calendar_connections), error: null }).then(resolve, reject)
      )

      tableChain.insert = vi.fn((payload: any) => {
        queryState.insertPayload = payload
        const inserted = {
          id: (globalThis as any).crypto?.randomUUID?.() ?? `mock-${Date.now()}`,
          ...payload,
        }
        db.external_calendar_connections.push(inserted)
        const insertChain: any = {}
        insertChain.select = vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: inserted, error: null })),
          single: vi.fn(async () => ({ data: inserted, error: null })),
        }))
        insertChain.maybeSingle = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.single = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.then = vi.fn((resolve, reject) =>
          Promise.resolve({ data: inserted, error: null }).then(resolve, reject)
        )
        return insertChain
      })

      tableChain.update = vi.fn((payload: any) => {
        queryState.updatePayload = payload
        const updateChain: any = {}
        updateChain.eq = vi.fn((column: string, value: any) => {
          if (column === 'id') {
            const idx = db.external_calendar_connections.findIndex((r) => r.id === value)
            if (idx >= 0) {
              db.external_calendar_connections[idx] = { ...db.external_calendar_connections[idx], ...payload }
            }
          }
          const result = { data: null, error: null }
          return {
            then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
          }
        })
        updateChain.then = vi.fn((resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject))
        return updateChain
      })

      tableChain.delete = vi.fn(() => {
        const deleteChain: any = {}
        deleteChain.eq = vi.fn((column: string, value: any) => {
          queryState.filters.push({ op: 'eq', column, value })
          return deleteChain
        })
        deleteChain.neq = vi.fn((column: string, value: any) => {
          queryState.filters.push({ op: 'neq', column, value })
          return deleteChain
        })
        deleteChain.then = vi.fn((resolve, reject) => {
          const toDelete = applyFilters(db.external_calendar_connections).map((r) => r.id)
          db.external_calendar_connections = db.external_calendar_connections.filter((r) => !toDelete.includes(r.id))
          return Promise.resolve({ data: null, error: null }).then(resolve, reject)
        })
        return deleteChain
      })

      return tableChain
    }

    if (table === 'bookings') {
      const db = getMockDb()

      const queryState: {
        filters: Array<{ op: 'eq' | 'neq' | 'gte' | 'lte'; column: string; value: any }>
        orderBy?: { column: string; ascending: boolean }
        limit?: number
      } = { filters: [] }

      const applyFilters = (rows: Array<Record<string, any>>) => {
        return rows.filter((row) =>
          queryState.filters.every((f) => {
            const v = row[f.column]
            if (f.op === 'eq') return v === f.value
            if (f.op === 'neq') return v !== f.value
            if (f.op === 'gte') return String(v) >= String(f.value)
            if (f.op === 'lte') return String(v) <= String(f.value)
            return true
          })
        )
      }

      const selectResult = () => {
        let rows = applyFilters(db.bookings)
        if (queryState.orderBy) {
          const { column, ascending } = queryState.orderBy
          rows = [...rows].sort((a, b) => {
            const av = String(a[column])
            const bv = String(b[column])
            if (av === bv) return 0
            return ascending ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
          })
        }
        if (typeof queryState.limit === 'number') rows = rows.slice(0, queryState.limit)
        return rows
      }

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'eq', column, value })
        return tableChain
      })
      tableChain.neq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'neq', column, value })
        return tableChain
      })
      tableChain.gte = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'gte', column, value })
        return tableChain
      })
      tableChain.lte = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'lte', column, value })
        return tableChain
      })
      tableChain.order = vi.fn((column: string, options?: { ascending?: boolean }) => {
        queryState.orderBy = { column, ascending: options?.ascending !== false }
        return tableChain
      })
      tableChain.limit = vi.fn((n: number) => {
        queryState.limit = n
        return tableChain
      })
      tableChain.maybeSingle = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.single = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: selectResult(), error: null }).then(resolve, reject)
      )

      tableChain.insert = vi.fn((payload: any) => {
        const inserted = {
          id: payload?.id ?? ((globalThis as any).crypto?.randomUUID?.() ?? `mock-${Date.now()}`),
          ...payload,
        }
        db.bookings.push(inserted)
        const insertChain: any = {}
        insertChain.select = vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: inserted, error: null })),
          single: vi.fn(async () => ({ data: inserted, error: null })),
        }))
        insertChain.maybeSingle = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.single = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.then = vi.fn((resolve, reject) =>
          Promise.resolve({ data: inserted, error: null }).then(resolve, reject)
        )
        return insertChain
      })

      tableChain.update = vi.fn((payload: any) => {
        const updateChain: any = {}
        updateChain.eq = vi.fn((column: string, value: any) => {
          if (column === 'id') {
            const idx = db.bookings.findIndex((r) => r.id === value)
            if (idx >= 0) db.bookings[idx] = { ...db.bookings[idx], ...payload }
          }
          const result = { data: null, error: null }
          const chained: any = {}
          chained.select = vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: column === 'id' ? db.bookings.find((r) => r.id === value) ?? null : null,
              error: null,
            })),
            single: vi.fn(async () => ({
              data: column === 'id' ? db.bookings.find((r) => r.id === value) ?? null : null,
              error: null,
            })),
          }))
          chained.then = vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject))
          return chained
        })
        updateChain.then = vi.fn((resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject))
        return updateChain
      })

      tableChain.delete = vi.fn(() => {
        const deleteState: Array<{ op: 'eq' | 'neq'; column: string; value: any }> = []
        const applyDeleteFilters = (rows: Array<Record<string, any>>) =>
          rows.filter((row) =>
            deleteState.every((f) => {
              const v = row[f.column]
              return f.op === 'eq' ? v === f.value : v !== f.value
            })
          )

        const deleteChain: any = {}
        deleteChain.eq = vi.fn((column: string, value: any) => {
          deleteState.push({ op: 'eq', column, value })
          return deleteChain
        })
        deleteChain.neq = vi.fn((column: string, value: any) => {
          deleteState.push({ op: 'neq', column, value })
          return deleteChain
        })
        deleteChain.then = vi.fn((resolve, reject) => {
          const toDelete = applyDeleteFilters(db.bookings).map((r) => r.id)
          db.bookings = db.bookings.filter((r) => !toDelete.includes(r.id))
          return Promise.resolve({ data: null, error: null }).then(resolve, reject)
        })
        return deleteChain
      })

      return tableChain
    }

    if (table === 'credit_ledger_entries') {
      const db = getMockDb()

      const queryState: {
        filters: Array<{ op: 'eq' | 'neq'; column: string; value: any }>
        insertPayload?: any
      } = { filters: [] }

      const applyFilters = (rows: Array<Record<string, any>>) => {
        return rows.filter((row) =>
          queryState.filters.every((f) => {
            const v = row[f.column]
            return f.op === 'eq' ? v === f.value : v !== f.value
          })
        )
      }

      const selectResult = () => applyFilters(db.credit_ledger_entries)

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'eq', column, value })
        return tableChain
      })
      tableChain.neq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'neq', column, value })
        return tableChain
      })
      tableChain.maybeSingle = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.single = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: selectResult(), error: null }).then(resolve, reject)
      )

      tableChain.insert = vi.fn((payload: any) => {
        const creditIntentId = payload?.credit_intent_id ?? null
        const existing = creditIntentId
          ? db.credit_ledger_entries.find((r) => r.credit_intent_id === creditIntentId) ?? null
          : null

        const insertResult =
          existing
            ? ({ data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } } as any)
            : ({
                data: {
                  id: payload?.id ?? ((globalThis as any).crypto?.randomUUID?.() ?? `mock-${Date.now()}`),
                  ...payload,
                },
                error: null,
              } as any)

        if (!existing && insertResult.data) {
          db.credit_ledger_entries.push(insertResult.data)
        }

        const insertChain: any = {}
        insertChain.select = vi.fn(() => ({
          single: vi.fn(async () => insertResult),
          maybeSingle: vi.fn(async () => insertResult),
        }))
        insertChain.single = vi.fn(async () => insertResult)
        insertChain.maybeSingle = vi.fn(async () => insertResult)
        insertChain.then = vi.fn((resolve, reject) => Promise.resolve(insertResult).then(resolve, reject))
        return insertChain
      })

      return tableChain
    }

    if (table === 'payment_intents') {
      const db = getMockDb()

      const queryState: {
        filters: Array<{ op: 'eq' | 'neq'; column: string; value: any }>
        insertPayload?: any
        updatePayload?: any
      } = { filters: [] }

      const applyFilters = (rows: Array<Record<string, any>>) => {
        return rows.filter((row) =>
          queryState.filters.every((f) => {
            const v = row[f.column]
            return f.op === 'eq' ? v === f.value : v !== f.value
          })
        )
      }

      const selectResult = () => applyFilters(db.payment_intents)

      const tableChain: any = {}
      tableChain.select = vi.fn(() => tableChain)
      tableChain.eq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'eq', column, value })
        return tableChain
      })
      tableChain.neq = vi.fn((column: string, value: any) => {
        queryState.filters.push({ op: 'neq', column, value })
        return tableChain
      })
      tableChain.maybeSingle = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.single = vi.fn(async () => {
        const rows = selectResult()
        return { data: rows[0] ?? null, error: null }
      })
      tableChain.then = vi.fn((resolve, reject) =>
        Promise.resolve({ data: selectResult(), error: null }).then(resolve, reject)
      )

      tableChain.insert = vi.fn((payload: any) => {
        const inserted = {
          id: payload?.id ?? ((globalThis as any).crypto?.randomUUID?.() ?? `mock-${Date.now()}`),
          status: payload?.status ?? 'created',
          metadata: payload?.metadata ?? {},
          ...payload,
        }
        db.payment_intents.push(inserted)

        const insertChain: any = {}
        insertChain.select = vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: inserted, error: null })),
          single: vi.fn(async () => ({ data: inserted, error: null })),
        }))
        insertChain.maybeSingle = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.single = vi.fn(async () => ({ data: inserted, error: null }))
        insertChain.then = vi.fn((resolve, reject) =>
          Promise.resolve({ data: inserted, error: null }).then(resolve, reject)
        )
        return insertChain
      })

      tableChain.update = vi.fn((payload: any) => {
        queryState.updatePayload = payload
        const updateChain: any = {}
        updateChain.eq = vi.fn((column: string, value: any) => {
          if (column === 'id') {
            const idx = db.payment_intents.findIndex((r) => r.id === value)
            if (idx >= 0) db.payment_intents[idx] = { ...db.payment_intents[idx], ...payload }
          }

          const selectChain: any = {}
          selectChain.select = vi.fn(() => ({
            single: vi.fn(async () => ({
              data: column === 'id' ? db.payment_intents.find((r) => r.id === value) ?? null : null,
              error: null,
            })),
            maybeSingle: vi.fn(async () => ({
              data: column === 'id' ? db.payment_intents.find((r) => r.id === value) ?? null : null,
              error: null,
            })),
          }))
          selectChain.single = vi.fn(async () => ({
            data: column === 'id' ? db.payment_intents.find((r) => r.id === value) ?? null : null,
            error: null,
          }))
          selectChain.maybeSingle = vi.fn(async () => ({
            data: column === 'id' ? db.payment_intents.find((r) => r.id === value) ?? null : null,
            error: null,
          }))
          return selectChain
        })
        return updateChain
      })

      return tableChain
    }

    // Special handling for availability_slots queries
    if (table === 'availability_slots') {
      const slotChain: any = {
        select: vi.fn((columns: string) => {
          // Reset query state when select is called
          slotQueryState = {}
          const selectChain: any = {}
          selectChain.eq = vi.fn((column: string, value: any) => {
            if (column === 'provider_id') slotQueryState.providerId = value
            if (column === 'start_time') slotQueryState.startTime = value
            if (column === 'end_time') slotQueryState.endTime = value
            if (column === 'is_available') slotQueryState.isAvailable = value
            return selectChain
          })
          selectChain.maybeSingle = vi.fn(async () => {
            // Return a slot if all required fields match
            if (
              slotQueryState.providerId &&
              slotQueryState.startTime &&
              slotQueryState.endTime &&
              slotQueryState.isAvailable === true
            ) {
              return {
                data: {
                  id: 'mock-slot-id',
                  provider_id: slotQueryState.providerId,
                  start_time: slotQueryState.startTime,
                  end_time: slotQueryState.endTime,
                  is_available: true,
                },
                error: null,
              }
            }
            return { data: null, error: null }
          })
          selectChain.single = vi.fn(async () => ({ data: null, error: null }))
          return selectChain
        }),
        eq: vi.fn(() => slotChain),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        single: vi.fn(async () => ({ data: null, error: null })),
      }
      return slotChain
    }

    return {
      select: readChain.select,
      eq: readChain.eq,
      neq: readChain.neq,
      or: readChain.or,
      gte: readChain.gte,
      lte: readChain.lte,
      ilike: readChain.ilike,
      order: readChain.order,
      range: readChain.range,
      limit: readChain.limit,
      single: readChain.single,
      maybeSingle: readChain.maybeSingle,
      then: readChain.then,
      insert: vi.fn(() => insertBuilder),
      update: vi.fn(() => mutationChain),
      upsert: vi.fn(() => upsertBuilder),
      delete: mutationChain.delete,
    }
  }

  // Create from function that can be spied on but actually calls buildFromChain
  const fromMock = vi.fn().mockImplementation((table: string) => buildFromChain(table))
  
  const mockSupabaseClient = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }, error: null }> => 
        ({ data: { user: null }, error: null })
      ) as any,
      signUp: vi.fn(async () => ({ data: { user: { id: 'mock-user' } }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn((email: string, options?: any) => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'mock-user', email: 'mock@example.com' } }, error: null })),
        deleteUser: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
    from: fromMock,
    rpc: vi.fn(async (functionName: string, args?: any) => {
      // Handle claim_slot_and_create_booking RPC call
      if (functionName === 'claim_slot_and_create_booking') {
        // Simulate the DB-side insert that the RPC would perform.
        const db = getMockDb()
        const slotId = args?.p_slot_id ?? 'mock-slot-id'

        // Simulate atomic slot exclusivity: only first claim wins.
        if (db.claimed_slot_ids.has(slotId)) {
          return {
            data: [
              {
                success: false,
                booking_id: null,
                error_message: 'Slot is not available',
              },
            ],
            error: null,
          }
        }

        db.claimed_slot_ids.add(slotId)

        const bookingId = args?.p_booking_id || 'mock-booking-id'
        if (!db.bookings.find((b) => b.id === bookingId)) {
          db.bookings.push({
            id: bookingId,
            customer_id: args?.p_customer_id ?? 'mock-customer-id',
            provider_id: args?.p_provider_id ?? 'mock-provider-id',
            service_id: args?.p_service_id ?? 'mock-service-id',
            start_time: slotQueryState.startTime ?? new Date().toISOString(),
            end_time:
              slotQueryState.endTime ??
              new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'pending',
            state: null,
            total_amount: args?.p_total_amount ?? 0,
          })
        }

        // Return the expected table format: [{ success: true, booking_id, error_message: null }]
        return {
          data: [
            {
              success: true,
              booking_id: args?.p_booking_id || 'mock-booking-id',
              error_message: null,
            },
          ],
          error: null,
        }
      }
      // Default RPC response for other functions
      return { data: null, error: null }
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        download: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' }, error: null })),
      })),
    },
  }

  return mockSupabaseClient
}

const defaultSupabaseModules = ['@/lib/supabaseClient', '@/lib/supabase', '@/lib/supabaseServer']

// Store the shared mock instance globally
let sharedMockInstance: ReturnType<typeof createMockSupabaseClient> | null = null

export function createSupabaseClientMocks(options?: { moduleIds?: string[] }) {
  const mockSupabaseClient = createMockSupabaseClient()
  sharedMockInstance = mockSupabaseClient
  const getClient = () => mockSupabaseClient
  const moduleExports = {
    supabase: mockSupabaseClient,
    supabaseBrowserClient: vi.fn(getClient),
    getBrowserSupabase: vi.fn(getClient),
    getServerSupabase: vi.fn(getClient),
    createSupabaseClient: vi.fn(getClient),
    getSupabaseClient: vi.fn(getClient),
  }

  const moduleIds = options?.moduleIds ?? defaultSupabaseModules
  const applyMock = (id: string) => {
    vi.doMock(id, () => moduleExports)
  }

  for (const id of moduleIds) {
    applyMock(id)
  }

  return { mockSupabaseClient, moduleExports, applyMock }
}

/**
 * Get the shared Supabase mock instance for overriding behavior in tests.
 * This should be used instead of creating new mock instances.
 */
export function getSupabaseMock() {
  if (!sharedMockInstance) {
    throw new Error('Supabase mocks not initialized. Call createSupabaseClientMocks() first (usually in setup.ts)')
  }
  return sharedMockInstance
}

export function resetSupabaseMock() {
  const mock = getSupabaseMock()
  for (const key of Object.keys(mock)) {
    const value: any = (mock as any)[key]
    if (typeof value === 'function' && 'mockClear' in value) {
      value.mockClear()
    }
  }

  // Also reset the in-memory DB used by stateful table mocks
  resetMockDb()
}
