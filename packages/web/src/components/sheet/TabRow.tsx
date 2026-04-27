import { useState, useRef } from 'react'
import { useUIStore, type ActiveTab } from '../../store/uiStore'
import { useThreadStore } from '../../store/threadStore'
import { api } from '../../lib/api'
import { useLocationStore } from '../../store/locationStore'

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'nearby', label: '🗺 nearby' },
  { id: 'hot', label: '🔥 hot' },
  { id: 'for-you', label: '✨ for you' },
  { id: 'search', label: '🔍' },
]

export function TabRow() {
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const setShowCreate = useUIStore((s) => s.setShowCreateThread)
  const darkMode = useUIStore((s) => s.darkMode)
  const setSearchResults = useThreadStore((s) => s.setSearchResults)
  const setSearchQuery = useThreadStore((s) => s.setSearchQuery)
  const geospaceId = useLocationStore((s) => s.geospaceId)
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const surfaceCol = darkMode ? 'var(--d2c-surface-2)' : '#F5F5F8'
  const cardBorder = darkMode ? 'var(--d2c-border)' : 'rgba(0,0,0,0.06)'
  const text2 = darkMode ? 'var(--d2c-text-2)' : '#555'

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim() || !geospaceId) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const { results } = await api.searchThreads(geospaceId, q)
      setSearchResults(results ?? [])
    } catch (err) {
      console.error('search error:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function onSearchChange(q: string) {
    setSearchInput(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSearch(q), 350)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '0 14px',
      }}
    >
      <div
        className="d2c-no-scrollbar"
        style={{
          display: 'flex',
          gap: 5,
          alignItems: 'center',
          overflow: 'auto',
        }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id)
                if (t.id !== 'search') setSearchInput('')
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--d2c-r-full)',
                background: active ? 'var(--d2c-violet)' : surfaceCol,
                color: active ? '#fff' : text2,
                border: active ? 'none' : `1px solid ${cardBorder}`,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s',
                fontFamily: "'Space Grotesk', sans-serif",
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 0 16px var(--d2c-violet-glow)' : 'none',
              }}
            >
              {t.label}
            </button>
          )
        })}

        <button
          aria-label="create thread"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowCreate(true)
          }}
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--d2c-violet), var(--d2c-pink))',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            fontWeight: 300,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px var(--d2c-violet-glow)',
            transition: 'transform 0.15s',
            fontFamily: 'inherit',
          }}
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>
      </div>

      {activeTab === 'search' && (
        <input
          type="text"
          placeholder="search threads..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              handleSearch(searchInput)
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--d2c-r-md)',
            background: darkMode ? 'var(--d2c-surface-2)' : '#f0f0f5',
            border: `1px solid ${cardBorder}`,
            color: darkMode ? 'var(--d2c-text)' : '#111',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      )}
    </div>
  )
}
