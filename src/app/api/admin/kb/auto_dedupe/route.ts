import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';
import { searchKb } from '@/lib/support/rag';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';

/**
 * Admin-only route to auto-deduplicate KB suggestions against newest KB
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

  // Get threshold from env or use default
  const threshold = Number(process.env.SUPPORT_KB_AUTO_DUP_RECHECK ?? 0.92);

  // Find pending suggestions with embeddings
  const { data: pending, error } = await admin.from('kb_suggestions')
    .select('id,q_embedding')
    .eq('status', 'pending')
    .not('q_embedding', 'is', null)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: 'No pending suggestions found' });
  }

  // Check each suggestion against KB
  const dupes = [];
  for (const item of pending) {
    try {
      // Skip if no embedding
      if (!item.q_embedding) continue;

      const hits = await searchKb(admin, item.q_embedding, 1, 0.0);
      const bestMatch = hits[0];
      
      // If similarity exceeds threshold, mark as duplicate
      if (bestMatch && bestMatch.similarity >= threshold) {
        const { error: updateError } = await admin.from('kb_suggestions')
          .update({ 
            status: 'duplicate', 
            target_article_id: bestMatch.article_id,
            similarity_to_best: bestMatch.similarity
          })
          .eq('id', item.id);
          
        if (!updateError) {
          dupes.push({
            id: item.id,
            article_id: bestMatch.article_id,
            similarity: bestMatch.similarity
          });
          logger.info('support.kb_suggest.duplicate', { 
            suggestion_id: item.id, 
            article_id: bestMatch.article_id,
            similarity: bestMatch.similarity
          });
        }
      }
    } catch (e) {
      console.error('Failed to check suggestion for duplicates', { id: item.id, error: e });
    }
  }

  return NextResponse.json({ 
    message: `Found ${dupes.length} duplicates among ${pending.length} pending suggestions`,
    dupes
  });
}
