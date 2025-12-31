#!/usr/bin/env node

/**
 * Script to generate embeddings for KB articles and update the database
 * Usage: node scripts/generate-embeddings.js [--provider openai|ollama] [--batch-size 10]
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const args = process.argv.slice(2);
const provider = args.find(arg => arg.startsWith('--provider='))?.split('=')[1] || 'ollama';
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 10;

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

let openai;
if (provider === 'openai') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Generate embedding using the specified provider
 */
async function generateEmbedding(text, provider) {
  try {
    if (provider === 'openai') {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } else if (provider === 'ollama') {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama2',
          prompt: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.embedding;
    }
  } catch (error) {
    console.error(`Error generating embedding for: "${text.substring(0, 50)}..."`, error.message);
    return null;
  }
}

/**
 * Update article with embedding
 */
async function updateArticleEmbedding(id, embedding) {
  try {
    const { error } = await supabase
      .from('kb_articles')
      .update({ embedding })
      .eq('id', id);

    if (error) {
      console.error(`Error updating article ${id}:`, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error updating article ${id}:`, error.message);
    return false;
  }
}

/**
 * Main function to process all articles
 */
async function processAllArticles() {
  console.log(`🚀 Starting embedding generation with ${provider} provider...`);
  console.log(`📊 Batch size: ${batchSize}`);

  // Get all articles without embeddings
  const { data: articles, error } = await supabase
    .from('kb_articles')
    .select('id, title, content')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching articles:', error.message);
    return;
  }

  if (articles.length === 0) {
    console.log('✅ All articles already have embeddings!');
    return;
  }

  console.log(`📝 Found ${articles.length} articles without embeddings`);

  // Process in batches
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);

    const promises = batch.map(async (article) => {
      const text = `${article.title}\n\n${article.content}`;
      const embedding = await generateEmbedding(text, provider);
      
      if (embedding) {
        const success = await updateArticleEmbedding(article.id, embedding);
        if (success) {
          console.log(`✅ Updated: ${article.title}`);
          return true;
        }
      }
      return false;
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    console.log(`📈 Batch completed: ${successCount}/${batch.length} successful`);

    // Rate limiting for API calls
    if (provider === 'openai') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  console.log('\n🎉 Embedding generation completed!');
}

/**
 * Update the get_query_embedding function in the database
 */
async function updateEmbeddingFunction() {
  try {
    // This is a simplified version - you'll need to implement the actual embedding call
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_query_embedding(query_text TEXT)
        RETURNS vector(1536) AS $$
        DECLARE
          embedding_data vector(1536);
        BEGIN
          -- Call your embedding service here
          -- For now, returning a placeholder
          -- You'll need to implement this based on your chosen provider
          RETURN '0'::vector(1536);
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.log('Note: Could not update embedding function (this is expected)');
    }
  } catch (error) {
    console.log('Note: Could not update embedding function (this is expected)');
  }
}

// Run the script
async function main() {
  try {
    await updateEmbeddingFunction();
    await processAllArticles();
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();
