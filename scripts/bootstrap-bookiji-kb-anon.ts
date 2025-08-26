import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

// Use anon key since service role key is having issues
const USE_LOCAL = false;

type Section = "faq" | "vendor" | "policy" | "troubleshooting";
type Locale = "en" | "fr";

const ROOT = path.resolve(process.cwd(), "docs", "bookiji-kb");

// Use anon key as a workaround
const SUPABASE_URL = "https://lzgynywojluwdccqkeop.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Z3lueXdvamx1d2RjY3FrZW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMjAxOTUsImV4cCI6MjA2NTY5NjE5NX0.uJfA8r87NSlgATiXOeryGnixhL3ROOYFZY-lMAq5sMU";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = USE_LOCAL 
  ? createClient("http://127.0.0.1:54321", "demo-key")
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Debug: Log the configuration being used
console.log('🔧 Supabase Configuration (Anon Key Workaround):');
console.log(`  USE_LOCAL: ${USE_LOCAL}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`  Using client for: ${USE_LOCAL ? 'LOCAL' : 'REMOTE (ANON KEY)'}`);
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
    // Enhanced error logging for debugging
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
  console.log(`┌──────────┬────────┐`);
  console.log(`│ (index)  │ Values │`);
  console.log(`├──────────┼────────┤`);
  console.log(`│ inserted │ ${inserted.toString().padStart(7)} │`);
  console.log(`│ updated  │ ${updated.toString().padStart(7)} │`);
  console.log(`│ skipped  │ ${skipped.toString().padStart(7)} │`);
  console.log(`│ errors   │ ${errors.toString().padStart(7)} │`);
  console.log(`└──────────┴────────┘`);
  
  if (errors === 0) {
    console.log("\n🎉 Success! Your KB articles have been imported.");
    console.log("Embeddings will be (re)generated by the `kb_article_changed` trigger.");
  } else {
    console.log(`\n⚠️  ${errors} files had errors. Check the logs above.`);
  }
}

main().catch(console.error);
