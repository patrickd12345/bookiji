import { vi } from 'vitest'

type SupabaseResponse<T> = { data: T; error: null }

const defaultListResponse: SupabaseResponse<any[]> = { data: [], error: null }
const defaultSingleResponse: SupabaseResponse<any> = { data: null, error: null }

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
      eq: vi.fn(() => eqChain),
      order: vi.fn(async () => ({ data: [], error: null }))
    }
    return {
      eq: vi.fn(() => eqChain),
      gte: vi.fn(async () => ({ data: [], error: null })),
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

  const deleteChain = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null }))
    }))
  }))

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
      })),
      single: vi.fn(async () => insertResult),
      ...thenable(insertResult),
    }

    const upsertBuilder = {
      select: vi.fn(() => ({
        single: vi.fn(async () => upsertResult),
      })),
      single: vi.fn(async () => upsertResult),
      ...thenable(upsertResult),
    }

    // Special handling for availability_slots queries
    if (table === 'availability_slots') {
      const slotChain: any = {
        select: vi.fn((columns: string) => {
          // Reset query state when select is called
          slotQueryState = {}
          return {
            eq: vi.fn((column: string, value: any) => {
              if (column === 'provider_id') slotQueryState.providerId = value
              if (column === 'start_time') slotQueryState.startTime = value
              if (column === 'end_time') slotQueryState.endTime = value
              if (column === 'is_available') slotQueryState.isAvailable = value
              return slotChain
            }),
            maybeSingle: vi.fn(async () => {
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
            }),
            single: vi.fn(async () => ({ data: null, error: null })),
          }
        }),
        eq: vi.fn(() => slotChain),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        single: vi.fn(async () => ({ data: null, error: null })),
      }
      return slotChain
    }

    // Special handling for bookings table
    if (table === 'bookings') {
      const bookingsChain: any = {
        select: vi.fn((columns: string) => {
          const selectChain: any = {
            eq: vi.fn((column: string, value: any) => {
              selectChain[`eq_${column}`] = value
              return selectChain
            }),
            gte: vi.fn((column: string, value: any) => {
              selectChain[`gte_${column}`] = value
              return selectChain
            }),
            lte: vi.fn((column: string, value: any) => {
              selectChain[`lte_${column}`] = value
              return selectChain
            }),
            order: vi.fn((column: string, options?: any) => {
              selectChain.orderBy = { column, options }
              return selectChain
            }),
            limit: vi.fn(async (count: number) => {
              // Return empty array for duplicate check (no existing bookings)
              return { data: [], error: null }
            }),
            single: vi.fn(async () => ({ data: null, error: null })),
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          }
          return selectChain
        }),
        update: vi.fn((values: any) => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: 'mock-booking-id',
                  customer_id: 'mock-customer-id',
                  provider_id: 'mock-provider-id',
                  service_id: 'mock-service-id',
                  start_time: '2025-01-02T10:00:00Z',
                  end_time: '2025-01-02T11:00:00Z',
                  status: 'pending',
                  state: 'quoted',
                  total_amount: 25,
                  stripe_payment_intent_id: 'pi_mock',
                  idempotency_key: 'mock-idempotency-key',
                  vendor_created: false,
                  vendor_created_by: null,
                  ...values,
                },
                error: null,
              })),
            })),
          })),
        })),
        insert: vi.fn(() => insertBuilder),
        eq: vi.fn(() => bookingsChain),
        single: readChain.single,
        maybeSingle: readChain.maybeSingle,
      }
      return bookingsChain
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
        deleteUser: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
    from: fromMock,
    rpc: vi.fn(async (functionName: string, args?: any) => {
      // Handle claim_slot_and_create_booking RPC call
      if (functionName === 'claim_slot_and_create_booking') {
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
}
