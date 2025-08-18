#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-https://localhost:3000}"
echo "Auditing $BASE"

curl -fsS -o /tmp/sitemap.xml "$BASE/sitemap.xml"
grep -Eq '<(urlset|sitemapindex)\b' /tmp/sitemap.xml && echo "✅ sitemap.xml"

curl -fsS -o /tmp/robots.txt "$BASE/robots.txt"
grep -iq '^User-agent:' /tmp/robots.txt && echo "✅ robots.txt"

curl -fsS -o /tmp/ads.txt "$BASE/ads.txt"
grep -Eq '^[^,#/ ]+,[^,#/ ]+,(DIRECT|RESELLER)' /tmp/ads.txt && echo "✅ ads.txt"
