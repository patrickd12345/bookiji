import { OpsAIStream, type StreamEventPayload } from './stream.js'
import {
  speakAnomaly,
  speakDeployments,
  speakHealth,
  speakLastChange,
  speakSummary
} from './voice.js'

const feedLog = document.getElementById('feed-log')
const statusEl = document.getElementById('stream-status')
const stream = new OpsAIStream()

function log(event: { title: string; detail: string }) {
  if (!feedLog) return
  const card = document.createElement('div')
  card.className = 'feed-card'
  card.innerHTML = `
    <strong>${event.title}</strong>
    <p>${event.detail}</p>
    <time>${new Date().toLocaleTimeString()}</time>
  `
  feedLog.prepend(card)
}

async function safeJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!res.ok) return fallback
    const json = (await res.json()) as T
    return json ?? fallback
  } catch {
    return fallback
  }
}

async function handleSummary() {
  const summary = await safeJson('/api/ops/summary', {
    message: 'Offline summary',
    deployments: []
  })
  speakSummary(summary as any)
  log({ title: 'Summary', detail: summary.message || 'Read aloud' })
}

async function handleHealth() {
  const health = await safeJson('/api/ops/health', {
    status: 'unknown',
    impacted: []
  })
  speakHealth(health as any)
  log({
    title: 'Health ping',
    detail: `Status: ${(health as any).status || (health as any).overall || 'unknown'}`
  })
}

async function handleDeployments() {
  const deployments = await safeJson('/api/ops/deployments', [])
  speakDeployments(Array.isArray(deployments) ? deployments : (deployments as any).deployments)
  const count = Array.isArray(deployments)
    ? deployments.length
    : Array.isArray((deployments as any)?.deployments)
    ? (deployments as any).deployments.length
    : 0
  log({
    title: 'Deployments',
    detail: count ? `${count} deployment(s) narrated` : 'Aucun déploiement n’a encore été enregistré.'
  })
}

async function handleLastChange() {
  const deployments = await safeJson('/api/ops/deployments', [])
  const list = Array.isArray(deployments)
    ? deployments
    : Array.isArray((deployments as any).deployments)
    ? (deployments as any).deployments
    : []
  const latest = list[0]
  speakLastChange(
    latest
      ? { description: `${latest.service || 'service'} shipped ${latest.version || 'unknown version'}` }
      : null
  )
  log({
    title: 'Last change',
    detail: latest
      ? `${latest.service || 'service'} ${latest.version || 'n/a'}`
      : 'Waiting for first deployment'
  })
}

function handleSubscribe() {
  stream.start('/api/ops/events/stream')
  if (statusEl) statusEl.textContent = 'Voice alerts armed via SSE/mock'
  log({ title: 'Subscriptions', detail: 'Voice alerts enabled' })
}

function bindControls() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-action]')
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'summary':
          handleSummary()
          break
        case 'health':
          handleHealth()
          break
        case 'deployments':
          handleDeployments()
          break
        case 'last-change':
          handleLastChange()
          break
        case 'subscribe':
          handleSubscribe()
          break
      }
    })
  })
}

function bindStream() {
  stream.subscribe((event: StreamEventPayload) => {
    switch (event.type) {
      case 'health':
        speakHealth(event.data)
        log({ title: 'Health update', detail: `Status ${event.data.status}` })
        break
      case 'deployment':
        speakDeployments([event.data])
        log({
          title: 'Deployment',
          detail: `${event.data.service || 'service'} ${event.data.version || ''} ${event.data.status || ''}`
        })
        break
      case 'anomaly':
        speakAnomaly(event.data.description || 'Anomaly detected')
        log({ title: 'Anomaly', detail: event.data.description || 'Anomaly detected' })
        break
    }
  })
}

bindControls()
bindStream()
