export type SummaryLike = {
  message?: string
  health?: { overall?: string }
  deployments?: Array<{ service?: string; version?: string }>
}

export type HealthLike = {
  status?: string
  overall?: string
  impacted?: string[]
}

const fallbackNoDeployments = 'Aucun déploiement n’a encore été enregistré.'

function speak(text: string, lang = 'en-US', rate = 1) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
}

export function speakSummary(summary: SummaryLike) {
  const deployments = summary.deployments || []
  const deploymentLine = deployments.length
    ? `${deployments.length} deployments detected. Latest is ${
        deployments[deployments.length - 1]?.service || 'unknown service'
      }.`
    : fallbackNoDeployments

  const overall = summary.health?.overall || 'unknown'
  const message =
    summary.message ||
    `OpsAI summary: health ${overall}. ${deploymentLine}`

  speak(message)
}

export function speakHealth(health: HealthLike) {
  const status = health.status || health.overall || 'unknown'
  const impacted = health.impacted?.length
    ? `Impacted: ${health.impacted.join(', ')}`
    : 'No impacted services reported.'
  speak(`Health status is ${status}. ${impacted}`)
}

export function speakDeployments(deployments: Array<{ service?: string; version?: string }>) {
  if (!deployments || deployments.length === 0) {
    speak(fallbackNoDeployments, 'fr-FR', 0.98)
    return
  }
  const lines = deployments.map((d, idx) => {
    const prefix = idx === 0 ? 'Latest' : 'Previous'
    return `${prefix}: ${d.service || 'unknown service'} version ${d.version || 'n/a'}.`
  })
  lines.forEach((l, i) => speak(l, 'en-US', i === 0 ? 1 : 0.94))
}

export function speakLastChange(change: { description?: string } | null | undefined) {
  const text =
    change?.description ||
    'No recent change logs were found. OpsAI will notify you when deployments land.'
  speak(text)
}

export function speakAnomaly(description: string) {
  speak(description, 'en-US', 1.05)
}
