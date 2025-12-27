import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { embed } from '@/lib/support/embeddings';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * Admin-only route to ensure all KB suggestions have embeddings
 * 
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST(_req: Request) {
  // Admin authentication check
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminUser = await requireAdmin(session);
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
  } catch (_error) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
  const admin = createClient(url, secretKey, { auth: { persistSession: false } });

  // Find suggestions without embeddings
  const { data: missing, error } = await admin.from('kb_suggestions')
    .select('id,question,answer')
    .or('q_embedding.is.null,a_embedding.is.null')
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!missing || missing.length === 0) {
    return NextResponse.json({ message: 'No missing embeddings found' });
  }

  // Process in batches
  const updated = [];
  for (const item of missing) {
    try {
      const [qEmb] = await embed([item.question]);
      const [aEmb] = await embed([item.answer]);
      
      const { error: updateError } = await admin.from('kb_suggestions')
        .update({ q_embedding: qEmb, a_embedding: aEmb })
        .eq('id', item.id);
        
      if (!updateError) {
        updated.push(item.id);
      }
    } catch (e) {
      console.error('Failed to update embeddings for suggestion', { id: item.id, error: e });
    }
  }

  return NextResponse.json({ 
    message: `Updated ${updated.length} of ${missing.length} suggestions with missing embeddings`,
    updated
  });
}
