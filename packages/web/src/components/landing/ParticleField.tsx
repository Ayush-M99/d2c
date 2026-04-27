import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FieldProps {
  count?: number
}

function Particles({ count = 400 }: FieldProps) {
  const meshRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const baseColors = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#22d3ee'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#ec4899'),
    ]

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4

      const c = baseColors[Math.floor(Math.random() * baseColors.length)]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime() * 0.08
    meshRef.current.rotation.y = t
    meshRef.current.rotation.x = t * 0.4
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

export function ParticleField({ count }: FieldProps) {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: false, alpha: true }}
    >
      <Particles count={count} />
    </Canvas>
  )
}
