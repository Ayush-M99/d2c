import { useCallback, useState } from 'react'
import { MapView } from '../components/map/MapView'
import { LayerControl } from '../components/map/LayerControl'
import { TimeSlider } from '../components/map/TimeSlider'
import { AggregateStats } from '../components/map/AggregateStats'
import { ZonePopover } from '../components/map/ZonePopover'
import { TopBar } from '../components/common/TopBar'
import { BottomSheet } from '../components/sheet/BottomSheet'
import { TabRow } from '../components/sheet/TabRow'
import { ThreadCard } from '../components/sheet/ThreadCard'
import { CreateThreadSheet } from '../components/sheet/CreateThreadSheet'
import { useUIStore } from '../store/uiStore'
import { useLocationStore } from '../store/locationStore'
import { useThreadStore } from '../store/threadStore'
import {
  ALL_LAYERS_ON,
  D2C_THREADS,
  MAP_ZONES,
  type LayerToggles,
  type MapZone,
} from '../lib/mapData'

function ThreadList({ currentHour }: { currentHour: number }) {
  const activeTab = useUIStore((s) => s.activeTab)
  const darkMode = useUIStore((s) => s.darkMode)
  const sheetSnap = useUIStore((s) => s.sheetSnap)
  const geospaceId = useLocationStore((s) => s.geospaceId)
  const hot = useThreadStore((s) => s.hot)
  const forYou = useThreadStore((s) => s.forYou)
  const nearby = useThreadStore((s) => s.nearby)
  const searchResults = useThreadStore((s) => s.searchResults)

  const realThreads =
    activeTab === 'for-you'
      ? forYou
      : activeTab === 'search'
        ? searchResults
        : activeTab === 'nearby'
          ? nearby
          : hot

  let demoThreads = D2C_THREADS
  if (activeTab === 'hot') demoThreads = D2C_THREADS.filter((t) => t.active > 10)
  else if (activeTab === 'for-you')
    demoThreads = D2C_THREADS.filter((t) => ['food', 'culture', 'outdoors'].includes(t.zone))

  const useBackendThreads = geospaceId && realThreads.length > 0

  const text3 = darkMode ? 'var(--d2c-text-3)' : '#999'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 80px' }} className="d2c-no-scrollbar">
      {sheetSnap > 0 && (
        <div style={{ padding: '8px 0 0' }}>
          <AggregateStats zones={MAP_ZONES} currentHour={currentHour} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
        {useBackendThreads
          ? realThreads.map((t, i) => (
              <ThreadCard key={t.threadId} thread={t} index={i} mode="backend" />
            ))
          : demoThreads.map((t, i) => (
              <ThreadCard key={t.id} thread={t} index={i} mode="demo" />
            ))}
        {geospaceId && realThreads.length === 0 && demoThreads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: text3, fontSize: 13 }}>
            no threads here yet
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [layers, setLayers] = useState<LayerToggles>(ALL_LAYERS_ON)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null)

  const showCreate = useUIStore((s) => s.showCreateThread)
  const setShowCreate = useUIStore((s) => s.setShowCreateThread)
  const darkMode = useUIStore((s) => s.darkMode)

  const handleZoneTap = useCallback((zone: MapZone) => setSelectedZone(zone), [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: darkMode ? 'var(--d2c-bg)' : '#F5F5F8',
        overflow: 'hidden',
      }}
    >
      <MapView
        layers={layers}
        showAnalytics={showAnalytics}
        currentHour={currentHour}
        onZoneTap={handleZoneTap}
      />

      <LayerControl
        layers={layers}
        setLayers={setLayers}
        showAnalytics={showAnalytics}
        setShowAnalytics={setShowAnalytics}
      />

      {showAnalytics && <TimeSlider value={currentHour} onChange={setCurrentHour} />}

      <TopBar />

      <BottomSheet>
        <div style={{ padding: '6px 0 8px', flexShrink: 0 }}>
          <TabRow />
        </div>
        <ThreadList currentHour={currentHour} />
      </BottomSheet>

      {selectedZone && <ZonePopover zone={selectedZone} onClose={() => setSelectedZone(null)} />}

      {showCreate && <CreateThreadSheet onClose={() => setShowCreate(false)} />}
    </div>
  )
}
