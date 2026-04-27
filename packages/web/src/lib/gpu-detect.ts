import { getGPUTier } from 'detect-gpu'

export type GpuCapability = 'high' | 'medium' | 'low' | 'none'

let cached: GpuCapability | null = null

export async function detectGpuCapability(): Promise<GpuCapability> {
  if (cached) return cached

  try {
    const tier = await getGPUTier()
    if (tier.tier >= 3) cached = 'high'
    else if (tier.tier >= 2) cached = 'medium'
    else if (tier.tier >= 1) cached = 'low'
    else cached = 'none'
  } catch {
    cached = 'none'
  }

  return cached
}

export function shouldEnable3D(capability: GpuCapability): boolean {
  return capability === 'high' || capability === 'medium'
}

export function getParticleCount(capability: GpuCapability, base: number): number {
  switch (capability) {
    case 'high': return base
    case 'medium': return Math.floor(base * 0.5)
    case 'low': return Math.floor(base * 0.25)
    default: return 0
  }
}
