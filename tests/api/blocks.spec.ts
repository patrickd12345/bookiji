/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
// FIRST_EDIT: delete early imports
// DELETE LINE: import { POST as createBlock } from '@/app/api/blocks/create/route'
// DELETE LINE: import { GET as listBlocks } from '@/app/api/blocks/list/route'
// DELETE LINE: import { DELETE as deleteBlock } from '@/app/api/blocks/delete/route'
// DELETE LINE: import { NextRequest } from 'next/server'

// Ensure env vars exist so the route handlers don't throw
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-test-key'

/**
 * Create a minimal mock of Supabase client that supports the chained
 * calls used in the blocks API routes.
 */
function createMockSupabaseClient() {
  const mockUserId = 'user-123'

  // Builder returned by supabase.from(...)
  const createBuilder = (table: string) => {
    let isInsert = false
    let insertPayload: any = null
    let isDelete = false
    const conditions: Record<string, any> = {}

    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn((payload) => {
        isInsert = true
        insertPayload = payload
        return builder
      }),
      delete: vi.fn(() => {
        isDelete = true
        return builder
      }),
      eq: vi.fn((field: string, value: any) => {
        conditions[field] = value
        return builder
      }),
      single: vi.fn(async () => {
        // If verifying delete (id match) return existing block
        if (conditions['id'] === 'block-1') {
          return {
            data: {
              id: 'block-1',
              blocker_id: mockUserId,
              blocked_id: 'user-456'
            },
            error: null
          }
        }

        // For select-before-create: no existing block
        if (!isInsert) {
          return { data: null, error: null }
        }
        // For the insert chain: return newly created block
        return {
          data: {
            id: 'block-1',
            blocker_id: mockUserId,
            blocked_id: insertPayload?.[0]?.blocked_id ?? 'user-456',
            reason: insertPayload?.[0]?.reason ?? null
          },
          error: null
        }
      }),
      then: undefined
    }

    // To support await on delete builder chain resolution
    builder.eq = vi.fn((field: string, value: any) => {
      conditions[field] = value
      if (isDelete && field === 'blocker_id') {
        return Promise.resolve({ error: null })
      }
      return builder
    })

    return builder
  }

  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: mockUserId } },
        error: null
      })
    },
    from: vi.fn((table: string) => createBuilder(table))
  }
}

// Mock next/headers cookies utility before importing the route handlers
vi.mock('next/headers', () => {
  return {
    cookies: () => ({
      get: (_name?: string) => undefined
    })
  }
})

// Mock the @supabase/ssr module before importing the route handlers
vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn(() => createMockSupabaseClient())
  }
})

// SECOND_EDIT: add imports after mocks
import { POST as createBlock } from '@/app/api/blocks/create/route'
import { GET as listBlocks } from '@/app/api/blocks/list/route'
import { DELETE as deleteBlock } from '@/app/api/blocks/delete/route'

const BASE_URL = process.env.TEST_BASE_URL || ''

describe('Blocks API endpoints', () => {
  it('POST /api/blocks/create should create a user block', async () => {
    const body = { blocked_id: 'user-456', reason: 'spam' }

    const response = await createBlock(new Request(`${BASE_URL}/api/blocks/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('id')
    expect(data.blocked_id).toBe('user-456')
  })

  it('GET /api/blocks/list should return block lists for user', async () => {
    const response = await listBlocks(new Request(`${BASE_URL}/api/blocks/list`, {
      method: 'GET'
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('blocks')
    expect(data).toHaveProperty('blocked_by')
    expect(Array.isArray(data.blocks)).toBe(true)
    expect(Array.isArray(data.blocked_by)).toBe(true)
  })

  it('DELETE /api/blocks/delete should delete a user block', async () => {
    const response = await deleteBlock(new Request(`${BASE_URL}/api/blocks/delete?id=block-1`, {
      method: 'DELETE'
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
  })
}) 