// SimCity creates life.
// It must never detect, label, classify, or evaluate behavior.
// OpsAI observes. SimCity does not think.

export type Actor = {
  id: string;
  type: 'customer' | 'provider';
};

const population: Actor[] = buildPopulation();

export function pickRandomActors(count: number): Actor[] {
  const chosen: Actor[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = randomInt(0, population.length - 1);
    chosen.push(population[idx]);
  }
  return chosen;
}

function buildPopulation(): Actor[] {
  const actors: Actor[] = [];
  for (let i = 0; i < 200; i += 1) {
    actors.push({ id: `cust-${i}`, type: 'customer' });
  }
  for (let i = 0; i < 80; i += 1) {
    actors.push({ id: `prov-${i}`, type: 'provider' });
  }
  return actors;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
