export function getOpsMode(): 'real' | 'simcity' {
  return process.env.NEXT_PUBLIC_OPS_MODE === 'simcity' ? 'simcity' : 'real'
}
