export async function indexNowNotify(urls: string[]) {
  const host = process.env.CANONICAL_HOST!;
  const key = process.env.INDEXNOW_KEY!;
  if (!host || !key) throw new Error("Missing CANONICAL_HOST or INDEXNOW_KEY");
  const payload = {
    host,
    key,
    keyLocation: `https://${host}/indexnow-${key}.txt`,
    urlList: urls
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IndexNow failed: ${res.status} ${text}`);
  }
}
