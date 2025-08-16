import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Hit = { article_id: string; chunk_id: string; chunk_index: number; content: string; similarity: number };

export async function searchKb(admin: SupabaseClient, queryEmbedding: number[], k=6, minSim=0.60) {
  const { data, error } = await admin.rpc('match_kb', {
    query_embedding: queryEmbedding, match_count: k, min_sim: minSim
  });
  if (error) throw error;
  return data as Hit[];
}
