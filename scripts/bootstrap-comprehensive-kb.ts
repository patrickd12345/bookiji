import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const USE_LOCAL = false;

// Enhanced section types to cover all documentation
type Section = 
  | "faq" 
  | "vendor" 
  | "policy" 
  | "troubleshooting"
  | "user-guide"
  | "developer"
  | "admin"
  | "maintenance"
  | "api"
  | "deployment"
  | "system";

type Locale = "en" | "fr";

// Configuration for comprehensive import
const DOCS_CONFIG = {
  "docs/bookiji-kb": { section: "faq", priority: 1 },
  "docs/user-guides": { section: "user-guide", priority: 2 },
  "docs/development": { section: "developer", priority: 3 },
  "docs/maintenance": { section: "maintenance", priority: 4 },
  "docs/api": { section: "api", priority: 5 },
  "docs/deployment": { section: "deployment", priority: 6 },
  "docs": { section: "system", priority: 7 }
};

// NEW keys from JWT secret rotation
const SUPABASE_URL = "https://lzgynywojluwdccqkeop.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Z3lueXdvamx1d2RjY3FrZW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE2OTA2MCwiZXhwIjoyMDcxNzQ1MDYwfQ.bicooXJcNGZlb8xzUIRdq1WaMVczoSnkmIQtVxjt-Gc";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = USE_LOCAL
  ? createClient("http://127.0.0.1:54321", "demo-key")
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Comprehensive KB Bootstrap Starting...');
console.log(`  Target: ${USE_LOCAL ? 'LOCAL' : 'REMOTE'}`);
console.log(`  URL: ${SUPABASE_URL}`);
console.log('');

function* walk(dir: string): Generator<string> {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) yield* walk(p);
    else if (/\.(md|mdx)$/i.test(it.name)) yield p;
  }
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function safeLocale(x: any): Locale {
  return x === "fr" ? "fr" : "en";
}

function determineSection(filePath: string, frontmatter: any): Section {
  // Check if frontmatter specifies section
  if (frontmatter.section && frontmatter.section in DOCS_CONFIG) {
    return frontmatter.section as Section;
  }
  
  // Determine section based on file path
  for (const [dir, config] of Object.entries(DOCS_CONFIG)) {
    if (filePath.includes(dir)) {
      return config.section as Section;
    }
  }
  
  // Default fallback
  return "faq";
}

function extractTitle(filePath: string, frontmatter: any, content: string): string {
  // Use frontmatter title if available
  if (frontmatter.title) {
    return frontmatter.title;
  }
  
  // Extract from first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1];
  }
  
  // Use filename as fallback
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function upsertArticle(
  title: string,
  content: string,
  locale: Locale,
  section: Section,
  checksum: string,
  sourceRef?: string
) {
  try {
    // Check if article exists with same title and locale
    const { data: existing, error: findErr } = await supabase
      .from("kb_articles")
      .select("id, title, content, locale, section, url")
      .ilike("title", title)
      .eq("locale", locale)
      .maybeSingle();

    if (findErr && findErr.code !== "PGRST116") throw findErr;

    if (!existing) {
      const { data, error } = await supabase
        .from("kb_articles")
        .insert({
          title,
          content,
          locale,
          section,
          url: sourceRef ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { action: "inserted" as const, id: data!.id };
    } else {
      const existingChecksum = sha256(existing.content ?? "");
      if (existingChecksum === checksum) {
        return { action: "skipped" as const, id: existing.id };
      }
      const { data, error } = await supabase
        .from("kb_articles")
        .update({
          content,
          section,
          url: sourceRef ?? existing.url ?? null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw error;
      return { action: "updated" as const, id: data!.id };
    }
  } catch (error: any) {
    console.error(`❌ Error in upsertArticle for "${title}":`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
}

async function main() {
  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const processedFiles: string[] = [];
  
  console.log('📚 Scanning documentation directories...');
  
  // Process each documentation directory
  for (const [dir, config] of Object.entries(DOCS_CONFIG)) {
    const fullPath = path.resolve(process.cwd(), dir);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    console.log(`\n📁 Processing ${dir} (section: ${config.section})...`);
    
    for (const filePath of walk(fullPath)) {
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const { data: frontmatter, content } = matter(fileContent);
        
        // Extract metadata
        const title = extractTitle(filePath, frontmatter, content);
        const locale = safeLocale(frontmatter.locale);
        const section = determineSection(filePath, frontmatter);
        const checksum = sha256(content);
        
        console.log(`  📝 ${relativePath}`);
        console.log(`     Title: ${title}`);
        console.log(`     Section: ${section}, Locale: ${locale}`);
        
        const result = await upsertArticle(
          title,
          content,
          locale,
          section,
          checksum,
          relativePath
        );
        
        stats[result.action]++;
        processedFiles.push(relativePath);
        
        console.log(`     ✅ ${result.action}: ${result.id}`);
        
      } catch (error: any) {
        console.error(`     ❌ Error processing ${filePath}:`, error.message);
        stats.errors++;
      }
    }
  }
  
  console.log('\n🎉 Comprehensive KB Bootstrap Complete!');
  console.log('=====================================');
  console.log(`📊 Statistics:`);
  console.log(`  Inserted: ${stats.inserted}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Total Processed: ${processedFiles.length}`);
  
  console.log('\n📚 Articles by Section:');
  const sectionCounts = await getSectionCounts();
  Object.entries(sectionCounts).forEach(([section, count]) => {
    console.log(`  ${section}: ${count} articles`);
  });
  
  console.log('\n🌍 Articles by Locale:');
  const localeCounts = await getLocaleCounts();
  Object.entries(localeCounts).forEach(([locale, count]) => {
    console.log(`  ${locale}: ${count} articles`);
  });
}

async function getSectionCounts() {
  const { data } = await supabase
    .from('kb_articles')
    .select('section');
  
  const counts: Record<string, number> = {};
  data?.forEach(article => {
    counts[article.section] = (counts[article.section] || 0) + 1;
  });
  
  return counts;
}

async function getLocaleCounts() {
  const { data } = await supabase
    .from('kb_articles')
    .select('locale');
  
  const counts: Record<string, number> = {};
  data?.forEach(article => {
    counts[article.locale] = (counts[article.locale] || 0) + 1;
  });
  
  return counts;
}

main().catch(console.error);
