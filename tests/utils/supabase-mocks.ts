import { vi } from 'vitest'

type SupabaseResponse<T> = { data: T; error: null }

const defaultListResponse: SupabaseResponse<any[]> = { data: [], error: null }
const defaultSingleResponse: SupabaseResponse<any> = { data: null, error: null }

function createQueryChain(defaultThenResult: SupabaseResponse<any> = defaultListResponse) {
  const chain: any = {}
  const selectFallback = vi.fn(() => {
    const eqChain: any = {
      data: [],
      error: null,
      single: vi.fn(async () => ({ data: null, error: null })),
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

  const insertChain = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'insert-id' }, error: null }))
    }))
  }))

  const upsertChain = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'upsert-id' }, error: null }))
    }))
  }))

  chain.select = selectFallback
  chain.insert = insertChain
  chain.upsert = upsertChain
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
  const buildFromChain = () => {
    const readChain = createQueryChain(defaultListResponse)
    const mutationChain = createQueryChain(defaultSingleResponse)

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
      insert: mutationChain.insert,
      update: vi.fn(() => mutationChain),
      upsert: mutationChain.upsert,
      delete: mutationChain.delete,
    }
  }

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
    from: vi.fn((table: string) => buildFromChain()),
    rpc: vi.fn(async () => ({ data: null, error: null })),
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

const defaultSupabaseModules = ['@/lib/supabaseClient', '@/lib/supabase']

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
