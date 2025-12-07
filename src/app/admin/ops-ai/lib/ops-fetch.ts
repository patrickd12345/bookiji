export async function opsGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Ops API ${path} failed: ${res.status}`)
  return res.json()
}
