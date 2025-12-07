export function getOpsMode(): 'real' | 'simcity' {
  return process.env.OPS_MODE === 'simcity' ? 'simcity' : 'real'
}
