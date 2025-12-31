import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env.local
// dotenv.config({ path: '.env.local' });

// Use local Supabase for development
const USE_LOCAL = false;

type Section = "faq" | "vendor" | "policy" | "troubleshooting";
type Locale = "en" | "fr";

const ROOT = path.resolve(process.cwd(), "docs", "bookiji-kb");

// Explicit environment variables to bypass .env.local encoding issues
const SUPABASE_URL = "https://lzgynywojluwdccqkeop.supabase.co";
const SUPABASE_SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Z3lueXdvamx1d2RjY3FrZW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE2OTA2MCwiZXhwIjoyMDcxNzQ1MDYwfQ.bicooXJcNGZlb8xzUIRdq1WaMVczoSnkmIQtVxjt-Gc";

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = USE_LOCAL 
  ? createClient("http://127.0.0.1:54321", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU")
  : createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// Debug: Log the configuration being used
console.log('🔧 Supabase Configuration:');
console.log(`  USE_LOCAL: ${USE_LOCAL}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY ? SUPABASE_SECRET_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`  Using client for: ${USE_LOCAL ? 'LOCAL' : 'REMOTE'}`);

// Additional debugging
console.log('\n🔍 Environment Debug:');
console.log(`  process.env.SUPABASE_URL: ${process.env.SUPABASE_URL}`);
console.log(`  process.env.SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? process.env.SUPABASE_SECRET_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`  Direct SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  Direct SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY ? SUPABASE_SECRET_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
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

function safeSection(x: any): Section {
  return ["faq","vendor","policy","troubleshooting"].includes(x) ? x : "faq";
}

async function upsertArticle(
  title: string,
  content: string,
  locale: Locale,
  section: Section,
  checksum: string,
  sourceRef?: string
) {
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
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Docs folder not found: ${ROOT}`);
    process.exit(1);
  }

  let inserted = 0, updated = 0, skipped = 0, errors = 0;
  const files = Array.from(walk(ROOT));
  if (files.length === 0) {
    console.log("No Markdown files found. Put .md/.mdx files under docs/bookiji-kb/");
    return;
  }

  console.log(`Discovered ${files.length} files. Importing…\n`);
  for (const file of files) {
    try {
      console.log(`Processing: ${file}`);
      const raw = fs.readFileSync(file, "utf8");
      const { data, content } = matter(raw);
      const title = (data.title || path.basename(file, path.extname(file))).toString().trim();
      const locale = safeLocale(data.locale);
      const section = safeSection(data.section);
      const sourceRef = `file://${path.relative(process.cwd(), file)}`;
      const checksum = sha256(content);

      console.log(`  Title: ${title}, Locale: ${locale}, Section: ${section}`);

      const res = await upsertArticle(title, content, locale, section, checksum, sourceRef);
      if (res.action === "inserted") inserted++;
      else if (res.action === "updated") updated++;
      else if (res.action === "skipped") skipped++;
      
      console.log(`  ✅ ${res.action}: ${res.id}`);
    } catch (err: any) {
      console.error(`❌ ERROR on ${file}:`, err);
      console.error(`  Error details:`, {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      errors++;
    }
  }

  console.log("\nDone.");
  console.table({ inserted, updated, skipped, errors });
  console.log("Embeddings will be (re)generated by the `kb_article_changed` trigger.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
