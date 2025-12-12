import { vi } from 'vitest'

type SupabaseResponse<T> = { data: T; error: null }

const defaultListResponse: SupabaseResponse<any[]> = { data: [], error: null }
const defaultSingleResponse: SupabaseResponse<any> = { data: null, error: null }

function createQueryChain(defaultThenResult: SupabaseResponse<any> = defaultListResponse) {
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.upsert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
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

    mutationChain.select = vi.fn(() => mutationChain)

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
      insert: vi.fn(() => mutationChain),
      update: vi.fn(() => mutationChain),
      upsert: vi.fn(() => mutationChain),
      delete: vi.fn(() => mutationChain),
    }
  }

  const mockSupabaseClient = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      admin: {
        deleteUser: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
    from: vi.fn(() => buildFromChain()),
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

export function createSupabaseClientMocks(options?: { moduleIds?: string[] }) {
  const mockSupabaseClient = createMockSupabaseClient()
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
  const applyMock = (id: string) => vi.mock(id, () => moduleExports)

  for (const id of moduleIds) {
    applyMock(id)
  }

  return { mockSupabaseClient, moduleExports, applyMock }
}
