export function withDefaultStorageDryRun(args, platform) {
  const normalized = Array.isArray(args) ? [...args] : []
  const hasApply = normalized.some((arg) => arg === '--apply' || arg === '-Apply')
  const hasDryRun = normalized.some((arg) => arg === '--dry-run' || arg === '-DryRun')

  if (hasApply || hasDryRun) {
    return normalized
  }

  const dryRunFlag = platform === 'win32' ? '-DryRun' : '--dry-run'
  return [...normalized, dryRunFlag]
}
