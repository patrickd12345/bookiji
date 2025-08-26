import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KBArticle {
  id: string
  title: string
  content: string
  locale: string
  section: string
}

interface Chunk {
  article_id: string
  chunk_index: number
  content: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { record, old_record, eventType } = await req.json()
    
    if (!record || eventType !== 'INSERT' && eventType !== 'UPDATE') {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const article: KBArticle = record
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Split content into chunks (simple paragraph-based splitting)
    const chunks = splitContentIntoChunks(article.content, article.id)
    
    // Delete existing chunks for this article
    const { error: deleteError } = await supabase
      .from('kb_chunks')
      .delete()
      .eq('article_id', article.id)
    
    if (deleteError) {
      console.error('Error deleting existing chunks:', deleteError)
    }

    // Insert new chunks
    if (chunks.length > 0) {
      const { error: insertError } = await supabase
        .from('kb_chunks')
        .insert(chunks)
      
      if (insertError) {
        console.error('Error inserting chunks:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to insert chunks', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate embeddings for chunks (placeholder - would integrate with OpenAI/other embedding service)
    // For now, we'll just log that embeddings would be generated
    console.log(`Generated ${chunks.length} chunks for article: ${article.title}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks_generated: chunks.length,
        article_id: article.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing KB article:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function splitContentIntoChunks(content: string, articleId: string): Chunk[] {
  // Simple paragraph-based chunking
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
  
  return paragraphs.map((paragraph, index) => ({
    article_id: articleId,
    chunk_index: index,
    content: paragraph.trim()
  }))
}
