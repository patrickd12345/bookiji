import { cookies } from 'next/headers'
import { getServerSupabase } from './supabaseClient'

const createSupabaseClient = () => getServerSupabase()
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
} as const

class AuthManager {
  private static readonly AUTH_COOKIE = 'auth_token'
  private static readonly REFRESH_COOKIE = 'refresh_token'

  static async getTokens(): Promise<AuthTokens | null> {
    const cookieStore = await cookies()
    const auth = cookieStore.get(this.AUTH_COOKIE)
    const refresh = cookieStore.get(this.REFRESH_COOKIE)

    if (!auth?.value || !refresh?.value) return null

    return {
      accessToken: auth.value,
      refreshToken: refresh.value
    }
  }

  static async setTokens(tokens: AuthTokens): Promise<void> {
    const cookieStore = await cookies()

    cookieStore.set({
      name: this.AUTH_COOKIE,
      value: tokens.accessToken,
      ...COOKIE_CONFIG,
      maxAge: 60 * 60 // 1 hour
    } as ResponseCookie)

    cookieStore.set({
      name: this.REFRESH_COOKIE,
      value: tokens.refreshToken,
      ...COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60 // 7 days
    } as ResponseCookie)
  }

  static async clearTokens(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(this.AUTH_COOKIE)
    cookieStore.delete(this.REFRESH_COOKIE)
  }

  static async refreshSession(): Promise<AuthTokens | null> {
    const tokens = await this.getTokens()
    if (!tokens?.refreshToken) return null

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: tokens.refreshToken
      })

      if (error || !data.session) {
        await this.clearTokens()
        return null
      }

      const newTokens: AuthTokens = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }

      await this.setTokens(newTokens)
      return newTokens
    } catch (error) {
      console.error('Failed to refresh session:', error)
      await this.clearTokens()
      return null
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getTokens()
    if (!tokens) return false

    try {
      const supabase = createSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser(tokens.accessToken)

      if (error || !user) {
        const newTokens = await this.refreshSession()
        return !!newTokens
      }

      return true
    } catch (error) {
      console.error('Error checking authentication:', error)
      return false
    }
  }

  static async getCurrentUser() {
    const tokens = await this.getTokens()
    if (!tokens) return null

    try {
      const supabase = createSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser(tokens.accessToken)

      if (error || !user) {
        const newTokens = await this.refreshSession()
        if (!newTokens) return null

        const { data: { user: refreshedUser } } = await supabase.auth.getUser(newTokens.accessToken)
        return refreshedUser
      }

      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }
}

// Export the static methods
export const {
  getTokens,
  setTokens,
  clearTokens,
  refreshSession,
  isAuthenticated,
  getCurrentUser
} = AuthManager 