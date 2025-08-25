import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function withBase(base: string, path: string) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

(async () => {
  const cfg = JSON.parse(readFileSync(resolve("seo/route-inventory.json"), "utf8"));
  const base = process.env[cfg.baseUrlEnv] || "http://localhost:3000";

  const res = await fetch(withBase(base, "/sitemap.xml"));
  if (!res.ok) throw new Error(`GET /sitemap.xml -> ${res.status}`);
  const xml = await res.text();
  const locs = extractLocs(xml);
  const set = new Set(locs);

  const missing = cfg.required.map((p: string) => withBase(base, p)).filter((u: string) => !set.has(u));
  const forbidden = cfg.forbidden.map((p: string) => withBase(base, p)).filter((u: string) => set.has(u));
  const leaks = locs.filter((u: string) => /vercel\.app/i.test(u));

  if (missing.length) console.error("❌ Missing from sitemap:\n" + missing.join("\n"));
  if (forbidden.length) console.error("❌ Forbidden URLs present in sitemap:\n" + forbidden.join("\n"));
  if (leaks.length) console.error("❌ Non‑canonical host leaked into sitemap:\n" + leaks.join("\n"));

  assert.equal(missing.length, 0, "Sitemap is missing required URLs");
  assert.equal(forbidden.length, 0, "Sitemap contains forbidden URLs");
  assert.equal(leaks.length, 0, "Sitemap contains non‑canonical hosts");
  console.log("✅ Sitemap coverage looks good.");
})().catch(err => { console.error(err); process.exit(1); });
