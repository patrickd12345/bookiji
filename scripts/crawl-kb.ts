// @env-allow-legacy-dotenv
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
// Load .env.local first, then .env as fallback
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { getSupabaseConfig } from '../src/config/supabase';
import { getEmbeddingService } from '../src/lib/support/llm-service';

// Configuration
// For production crawling, set NEXT_PUBLIC_APP_URL=https://bookiji.com in your environment
// For local development, it will use http://localhost:3000 (if set) or default to production
const BASE_URL = process.env.KB_CRAWLER_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com';
const MAX_PAGES = parseInt(process.env.KB_CRAWLER_MAX_PAGES || '100', 10);
const MAX_DEPTH = parseInt(process.env.KB_CRAWLER_MAX_DEPTH || '5', 10);
const FORCE_RECRAWL = process.env.KB_CRAWLER_FORCE === 'true';
const VERBOSE = process.env.KB_CRAWLER_VERBOSE === 'true';
const IGNORE_PATHS = ['/admin', '/login', '/api', '/_next', '/auth', '/dashboard', '/_vercel', '/.well-known'];
const IGNORE_QUERY_PARAMS = true; // Normalize URLs by removing query params

// Initialize Clients
const config = getSupabaseConfig();
if (!config.secretKey) {
  console.error('Missing SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(config.url, config.secretKey);
const embeddingService = getEmbeddingService(); // Use embedding service for crawler

// Queue & Visited
interface QueueItem {
  url: string;
  depth: number;
}
const queue: QueueItem[] = [{ url: BASE_URL, depth: 0 }];
const visited = new Set<string>();

// Seed URLs from sitemap if available
async function seedFromSitemap() {
  try {
    const sitemapUrl = new URL('/sitemap.xml', BASE_URL).toString();
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Bookiji-KB-Crawler/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const xml = await res.text();
      const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        const urls = urlMatches.map(match => {
          const url = match.replace(/<\/?loc>/g, '');
          return normalizeUrl(url);
        }).filter(url => {
          try {
            const u = new URL(url);
            return u.origin === new URL(BASE_URL).origin && !shouldExclude(url);
          } catch {
            return false;
          }
        });
        
        if (urls.length > 0) {
          console.log(`Found ${urls.length} URLs in sitemap, adding to queue...`);
          urls.forEach(url => {
            if (!visited.has(url)) {
              queue.push({ url, depth: 0 });
            }
          });
        }
      }
    }
  } catch (e) {
    if (VERBOSE) {
      console.log(`Could not fetch sitemap: ${e}`);
    }
  }
}

// Normalize URL: remove fragments, query params, trailing slashes
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    if (IGNORE_QUERY_PARAMS) {
      u.search = '';
    }
    let path = u.pathname;
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return url;
  }
}

// Check if URL should be excluded
function shouldExclude(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return IGNORE_PATHS.some(ignore => path.startsWith(ignore.toLowerCase()));
  } catch {
    return true; // Exclude invalid URLs
  }
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    return await embeddingService.getEmbedding(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return []; // Return empty or handle error
  }
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function processPage(item: QueueItem) {
  const { url, depth } = item;
  const normalizedUrl = normalizeUrl(url);
  
  if (visited.has(normalizedUrl) || visited.size >= MAX_PAGES || depth > MAX_DEPTH) {
    if (depth > MAX_DEPTH) {
      console.log(`Skipping (Max depth): ${normalizedUrl}`);
    }
    return;
  }
  
  if (shouldExclude(normalizedUrl)) {
    console.log(`Skipping (Excluded path): ${normalizedUrl}`);
    return;
  }
  
  visited.add(normalizedUrl);
  console.log(`Crawling [depth=${depth}]: ${normalizedUrl}`);

  let stats = { crawled: 0, skipped: 0, errors: 0, reEmbedded: 0 };
  
  try {
    const res = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Bookiji-KB-Crawler/1.0' },
      signal: AbortSignal.timeout(30000) // 30s timeout
    });
    if (!res.ok) {
      console.warn(`Failed to fetch ${normalizedUrl}: ${res.status}`);
      stats.errors++;
      return stats;
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract content
    let title = $('title').text() || url;
    
    // If title is generic/default, make it unique using URL path
    const genericTitles = [
      'bookiji — universal booking platform',
      'bookiji - universal booking platform',
      'bookiji',
      'universal booking platform'
    ];
    const titleLower = title.toLowerCase().trim();
    if (genericTitles.some(gt => titleLower === gt || titleLower.includes(gt))) {
      // Extract meaningful title from URL path
      try {
        const urlObj = new URL(normalizedUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          // Use last path segment, formatted nicely
          const lastPart = pathParts[pathParts.length - 1];
          title = lastPart
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          title = 'Homepage';
        }
      } catch {
        // Fallback to URL if parsing fails
        title = normalizedUrl;
      }
    }
    
    // Remove scripts, styles, etc.
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    
    const content = $('body').text().replace(/\s+/g, ' ').trim();
    const contentHash = computeHash(content);

    // Check DB for idempotency (use normalized URL)
    const { data: existing } = await supabase
      .from('kb_articles')
      .select('id, content_hash')
      .eq('url', normalizedUrl)
      .maybeSingle();

    if (existing && existing.content_hash === contentHash && !FORCE_RECRAWL) {
      if (VERBOSE) {
        console.log(`Skipping (Unchanged): ${normalizedUrl} (use KB_CRAWLER_FORCE=true to force re-crawl)`);
      } else {
        console.log(`Skipping (Unchanged): ${normalizedUrl}`);
      }
      stats.skipped++;
      // Still extract links even if content unchanged
    } else {
      const wasUpdate = !!existing;
      console.log(`${wasUpdate ? 'Updating' : 'Indexing'}: ${normalizedUrl}`);
      stats.crawled++;
      if (wasUpdate) stats.reEmbedded++;
      
      // Upsert Article (manual upsert: insert or update)
      let article;
      let upsertError;
      
      if (existing) {
        // Update existing article
        const { data, error } = await supabase
          .from('kb_articles')
          .update({
            title,
            content,
            content_hash: contentHash,
            last_crawled_at: new Date().toISOString(),
            locale: 'en',
            section: 'faq'
          })
          .eq('id', existing.id)
          .select()
          .single();
        article = data;
        upsertError = error;
      } else {
        // Insert new article
        const { data, error } = await supabase
          .from('kb_articles')
          .insert({
            url: normalizedUrl,
            title,
            content,
            content_hash: contentHash,
            last_crawled_at: new Date().toISOString(),
            locale: 'en',
            section: 'faq'
          })
          .select()
          .single();
        article = data;
        upsertError = error;
      }

      if (upsertError) {
        console.error(`Error upserting article ${normalizedUrl}:`, upsertError);
        console.error('Full error details:', JSON.stringify(upsertError, null, 2));
        stats.errors++;
        return stats; // Exit early if upsert fails
      } else if (article) {
        // Chunking
        const chunkSize = 1000;
        const chunks = [];
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }

        // Delete old chunks/embeddings (idempotent - safe to retry)
        const { error: deleteError } = await supabase
          .from('kb_article_chunks')
          .delete()
          .eq('article_id', article.id);
        if (deleteError) {
          console.error(`Error deleting old chunks for ${normalizedUrl}:`, deleteError);
        }

        // Process Chunks with error handling
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          if (!chunkText.trim()) continue;
          
          try {
            console.log(`  Generating embedding for chunk ${i + 1}/${chunks.length}...`);
            const embedding = await getEmbedding(chunkText);
            
            if (embedding.length === 0) {
              console.warn(`Skipping chunk ${i} for ${normalizedUrl} - embedding failed`);
              stats.errors++;
              continue;
            }

            // Insert Chunk (idempotent via unique constraint on article_id + ord)
            const { data: chunkData, error: chunkError } = await supabase
              .from('kb_article_chunks')
              .upsert({
                article_id: article.id,
                ord: i,
                text: chunkText
              }, { onConflict: 'article_id,ord' })
              .select()
              .single();

            if (chunkError) {
              console.error(`Error inserting chunk ${i} for ${normalizedUrl}:`, chunkError);
              stats.errors++;
              continue;
            }

            // Insert Embedding (idempotent - chunk_id is PK)
            if (chunkData) {
              const { error: embedError } = await supabase
                .from('kb_embeddings')
                .upsert({
                  chunk_id: chunkData.id,
                  embedding
                }, { onConflict: 'chunk_id' });
              if (embedError) {
                console.error(`Error inserting embedding for chunk ${i} of ${normalizedUrl}:`, embedError);
                stats.errors++;
              }
            }
          } catch (chunkErr) {
            console.error(`Error processing chunk ${i} for ${normalizedUrl}:`, chunkErr);
            stats.errors++;
            // Continue with next chunk
          }
        }
      }
    }

    // Extract Links (only if within depth limit)
    if (depth < MAX_DEPTH) {
      let linksFound = 0;
      let linksAdded = 0;
      let linksExcluded = 0;
      let linksVisited = 0;
      
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        linksFound++;
        
        try {
          let fullUrl: string;
          if (href.startsWith('/')) {
            fullUrl = new URL(href, BASE_URL).toString();
          } else if (href.startsWith(BASE_URL)) {
            fullUrl = href;
          } else if (href.startsWith('http://') || href.startsWith('https://')) {
            // External link - skip
            if (VERBOSE) {
              console.log(`  External link skipped: ${href}`);
            }
            return;
          } else {
            // Relative path
            fullUrl = new URL(href, normalizedUrl).toString();
          }
          
          const normalized = normalizeUrl(fullUrl);
          if (shouldExclude(normalized)) {
            linksExcluded++;
            if (VERBOSE) {
              console.log(`  Excluded path: ${normalized}`);
            }
            return;
          }
          if (visited.has(normalized)) {
            linksVisited++;
            if (VERBOSE) {
              console.log(`  Already visited: ${normalized}`);
            }
            return;
          }
          
          queue.push({ url: normalized, depth: depth + 1 });
          linksAdded++;
          if (VERBOSE) {
            console.log(`  Added to queue: ${normalized}`);
          }
        } catch (linkErr) {
          // Skip invalid URLs
          if (VERBOSE) {
            console.log(`  Invalid URL skipped: ${href}`);
          }
        }
      });
      
      if (VERBOSE && linksFound > 0) {
        console.log(`  Link extraction: ${linksFound} found, ${linksAdded} added, ${linksExcluded} excluded, ${linksVisited} already visited`);
      }
    }

    return stats;
  } catch (e) {
    console.error(`Error processing ${normalizedUrl}:`, e);
    stats.errors++;
    return stats;
  }
}

async function crawl() {
  console.log(`Starting crawl: MAX_PAGES=${MAX_PAGES}, MAX_DEPTH=${MAX_DEPTH}, FORCE_RECRAWL=${FORCE_RECRAWL}, VERBOSE=${VERBOSE}`);
  
  // Try to seed from sitemap first
  await seedFromSitemap();
  
  const totalStats = { crawled: 0, skipped: 0, errors: 0, reEmbedded: 0 };
  
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const item = queue.shift();
    if (item) {
      const stats = await processPage(item);
      if (stats) {
        totalStats.crawled += stats.crawled;
        totalStats.skipped += stats.skipped;
        totalStats.errors += stats.errors;
        totalStats.reEmbedded += stats.reEmbedded;
      }
      // Rate limiting: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n=== Crawl Summary ===');
  console.log(`Total pages visited: ${visited.size}`);
  console.log(`Pages crawled: ${totalStats.crawled}`);
  console.log(`Pages skipped (unchanged): ${totalStats.skipped}`);
  console.log(`Pages re-embedded: ${totalStats.reEmbedded}`);
  console.log(`Errors: ${totalStats.errors}`);
  console.log('Crawl finished.');
  
  // Store last crawl timestamp (simple approach - could use a table)
  try {
    await supabase
      .from('kb_articles')
      .update({ updated_at: new Date().toISOString() })
      .eq('url', BASE_URL) // Use base URL as marker, or create a separate table
      .limit(0); // No-op update to trigger timestamp
  } catch (e) {
    // Ignore - observability is optional
  }
}

crawl();

