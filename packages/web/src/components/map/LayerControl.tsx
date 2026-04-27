import { useState } from 'react'
import { ZONE_COLORS, ZONES_META, type LayerToggles, type ZoneId } from '../../lib/mapData'
import { useUIStore } from '../../store/uiStore'

interface Props {
  layers: LayerToggles
  setLayers: (next: LayerToggles) => void
  showAnalytics: boolean
  setShowAnalytics: (v: boolean) => void
}

export function LayerControl({ layers, setLayers, showAnalytics, setShowAnalytics }: Props) {
  const [expanded, setExpanded] = useState(false)
  const darkMode = useUIStore((s) => s.darkMode)
  const bg = darkMode ? 'rgba(10,10,18,0.92)' : 'rgba(255,255,255,0.95)'
  const border = darkMode ? 'rgba(42,42,64,0.8)' : 'rgba(0,0,0,0.1)'
  const textCol = darkMode ? 'var(--d2c-text)' : '#333'
  const text3 = darkMode ? 'var(--d2c-text-3)' : '#888'

  return (
    <div
      style={{
        position: 'absolute',
        top: 62,
        left: 10,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: bg,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${border}`,
          borderRadius: 'var(--d2c-r-full)',
          padding: '7px 12px',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          fontFamily: 'inherit',
          color: textCol,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 14 }}>🗺</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Layers</span>
        <span style={{ fontSize: 10, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>
      {expanded && (
        <>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showAnalytics ? 'rgba(139,92,246,0.15)' : bg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${showAnalytics ? 'rgba(139,92,246,0.5)' : border}`,
              borderRadius: 'var(--d2c-r-full)',
              padding: '5px 10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 12 }}>📊</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: showAnalytics ? '#8B5CF6' : text3,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Analytics
            </span>
          </button>
          {ZONES_META.map((z) => {
            const active = layers[z.id]
            const color = ZONE_COLORS[z.id]
            return (
              <button
                key={z.id}
                onClick={() => setLayers({ ...layers, [z.id]: !layers[z.id] } as LayerToggles)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: active ? `${color}${darkMode ? '18' : '12'}` : bg,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${active ? color + '55' : border}`,
                  borderRadius: 'var(--d2c-r-full)',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 12 }}>{z.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: active ? color : text3,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {z.label}
                </span>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: active ? color : darkMode ? 'var(--d2c-border)' : '#ccc',
                    boxShadow: active ? `0 0 6px ${color}` : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

// Re-export type so consumers can avoid double imports
export type { ZoneId }
