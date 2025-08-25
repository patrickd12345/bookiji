export function canonicalUrl(path: string) {
  const host = process.env.CANONICAL_HOST ?? 'bookiji.com';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${p}`;
}
