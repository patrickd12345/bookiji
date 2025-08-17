import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { url, secretKey } = getSupabaseConfig()
  const cookieStore = cookies()
  
  // Create server-side Supabase client
  const supabase = createClient(url, secretKey!, { 
    auth: { persistSession: false },
    global: { headers: { Cookie: cookieStore.toString() } }
  })
  
  // Get user from auth context
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }
  
  // Check user role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex" data-testid="admin-shell">
      <aside className="w-64 border-r bg-white p-4 space-y-2">
        <div className="text-lg font-semibold mb-2">Admin Console</div>
        <nav className="flex flex-col gap-1">
          <a href="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100">
            <span>Dashboard</span>
          </a>
          <a href="/admin/support" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100">
            <span>Support Tickets</span>
          </a>
          <a href="/admin/faq" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100">
            <span>FAQ Management</span>
          </a>
          <a href="/admin/parameters" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100">
            <span>Admin Parameters</span>
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}