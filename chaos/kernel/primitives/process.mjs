export async function restartProcess(delayMs, rng) {
  const delay = delayMs || (10 + Math.floor((rng ? rng() : Math.random()) * 50))
  await new Promise(resolve => setTimeout(resolve, delay))
}

