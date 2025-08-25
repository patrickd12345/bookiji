import { indexNowNotify } from "../src/lib/seo/indexNow.js";

function base() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://bookiji.com").replace(/\/$/, "");
}

(async () => {
  const b = base();
  const changed = (process.env.CHANGED_URLS || "")
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const urls = changed.length ? changed : [`${b}/sitemap.xml`];
  console.log("IndexNow push:", urls);
  await indexNowNotify(urls);
  console.log("✅ IndexNow notified.");
})().catch(e => { console.error(e); process.exit(1); });
