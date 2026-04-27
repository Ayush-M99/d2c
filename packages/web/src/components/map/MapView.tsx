import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useUIStore } from '../../store/uiStore'
import { useLocationStore } from '../../store/locationStore'
import {
  D2C_THREADS,
  MAP_CENTER,
  MAP_ZONES,
  MAP_ZOOM,
  YOU_LAT,
  YOU_LNG,
  ZONE_COLORS,
  type LayerToggles,
  type MapZone,
} from '../../lib/mapData'

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

interface Props {
  layers: LayerToggles
  showAnalytics: boolean
  currentHour: number
  onZoneTap: (zone: MapZone) => void
}

export function MapView({ layers, showAnalytics, currentHour, onZoneTap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const youRef = useRef<L.Marker | null>(null)
  const zonesRef = useRef<L.Layer[]>([])
  const markersRef = useRef<L.Marker[]>([])
  const cardsRef = useRef<L.Marker[]>([])

  const darkMode = useUIStore((s) => s.darkMode)
  const setD2cTarget = useUIStore((s) => s.setD2cTarget)
  const pushToast = useUIStore((s) => s.pushToast)
  const userLat = useLocationStore((s) => s.lat)
  const userLng = useLocationStore((s) => s.lng)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: false,
    })
    mapRef.current = map

    const tile = L.tileLayer(darkMode ? DARK_TILES : LIGHT_TILES, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)
    tileRef.current = tile

    const youIcon = L.divIcon({
      className: '',
      html:
        '<div class="d2c-you-pin"><div class="d2c-you-ring"></div>' +
        '<div class="d2c-you-dot"><div class="d2c-you-inner"></div></div></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
    const youPos: L.LatLngExpression = [userLat ?? YOU_LAT, userLng ?? YOU_LNG]
    youRef.current = L.marker(youPos, { icon: youIcon, interactive: false }).addTo(map)

    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
      tileRef.current = null
      youRef.current = null
      zonesRef.current = []
      markersRef.current = []
      cardsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap tiles on theme change
  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(darkMode ? DARK_TILES : LIGHT_TILES)
  }, [darkMode])

  // Update you-pin position when GPS arrives
  useEffect(() => {
    if (!youRef.current) return
    if (userLat != null && userLng != null) {
      youRef.current.setLatLng([userLat, userLng])
      mapRef.current?.flyTo([userLat, userLng], MAP_ZOOM, { duration: 0.8 })
    }
  }, [userLat, userLng])

  // Zone polygon overlays
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    zonesRef.current.forEach((z) => z.remove())
    zonesRef.current = []
    if (!showAnalytics) return

    MAP_ZONES.forEach((zone) => {
      if (!layers[zone.id]) return
      const poly = L.polygon(zone.polygon, {
        color: zone.color,
        weight: 2,
        opacity: 0.6,
        fillColor: zone.color,
        fillOpacity: darkMode ? 0.15 : 0.1,
        dashArray: '6,4',
        className: 'd2c-zone-poly',
      }).addTo(map)
      poly.on('click', () => onZoneTap(zone))

      const labelIcon = L.divIcon({
        className: '',
        html:
          `<div class="d2c-zone-label" style="background:${darkMode ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.90)'};` +
          `color:${zone.color};border-color:${zone.color}44">${zone.label}</div>`,
        iconSize: [0, 0],
      })
      const label = L.marker(zone.center, { icon: labelIcon, interactive: false }).addTo(map)
      zonesRef.current.push(poly, label)
    })
  }, [layers, darkMode, showAnalytics, onZoneTap])

  // Thread pins
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const visible = D2C_THREADS.filter((t) => layers[t.zone])
    visible.forEach((thread) => {
      const color = ZONE_COLORS[thread.zone]
      const isHot = thread.active > 20
      const size = isHot ? 44 : 38
      const zone = MAP_ZONES.find((z) => z.id === thread.zone)
      const hourFactor = zone ? zone.stats.hourly[currentHour] / Math.max(...zone.stats.hourly, 1) : 1
      const scaledActive = Math.max(1, Math.round(thread.active * hourFactor))

      const html =
        `<div class="d2c-pin-wrap" style="--pin-color:${color}">` +
        `<div class="d2c-pin-pulse"></div><div class="d2c-pin-pulse d2c-pin-pulse-2"></div>` +
        `<div class="d2c-pin-core" style="width:${isHot ? 16 : 12}px;height:${isHot ? 16 : 12}px;` +
        `opacity:${0.4 + hourFactor * 0.6}">` +
        `${isHot ? '<div class="d2c-pin-hot-ring"></div>' : ''}</div>` +
        `<div class="d2c-pin-label"><span class="d2c-pin-emoji">${thread.emoji}</span>` +
        `<span class="d2c-pin-count">${scaledActive}</span></div></div>`

      const icon = L.divIcon({
        className: '',
        html,
        iconSize: [size, size + 24],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([thread.lat, thread.lng], { icon }).addTo(map)
      marker.on('click', () => {
        setD2cTarget({ lat: thread.lat, lng: thread.lng, threadId: String(thread.id) })
        pushToast('info', 'demo thread preview only - use + to create a live Manipal thread')
      })
      markersRef.current.push(marker)
    })
  }, [layers, currentHour, setD2cTarget, pushToast])

  // Floating analytics cards
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    cardsRef.current.forEach((c) => c.remove())
    cardsRef.current = []
    if (!showAnalytics) return

    MAP_ZONES.forEach((zone) => {
      if (!layers[zone.id]) return
      const cardLat = zone.center[0] + 0.0018
      const cardLng = zone.center[1] + 0.003
      const hourFactor = zone.stats.hourly[currentHour] / Math.max(...zone.stats.hourly, 1)
      const scaledActive = Math.max(1, Math.round(zone.stats.active * hourFactor))

      const points = zone.stats.hourly
        .map((v, i) => `${(i / 23) * 110},${20 - (v / Math.max(...zone.stats.hourly)) * 16}`)
        .join(' ')
      const dotY = 20 - (zone.stats.hourly[currentHour] / Math.max(...zone.stats.hourly)) * 16

      const html =
        `<div class="d2c-floating-card" style="--zone-color:${zone.color};` +
        `background:${darkMode ? 'rgba(10,10,20,0.92)' : 'rgba(255,255,255,0.95)'}">` +
        `<div class="d2c-fc-header">` +
        `<div class="d2c-fc-dot" style="background:${zone.color};box-shadow:0 0 8px ${zone.color}"></div>` +
        `<span class="d2c-fc-title" style="color:${zone.color}">${zone.label}</span></div>` +
        `<div class="d2c-fc-stats">` +
        `<div class="d2c-fc-stat"><span class="d2c-fc-num" style="color:${darkMode ? '#F0F0F8' : '#111'}">${scaledActive}</span>` +
        `<span class="d2c-fc-label">active</span></div>` +
        `<div class="d2c-fc-stat"><span class="d2c-fc-num" style="color:${darkMode ? '#F0F0F8' : '#111'}">${zone.stats.threads}</span>` +
        `<span class="d2c-fc-label">threads</span></div></div>` +
        `<svg class="d2c-fc-spark" width="110" height="20" viewBox="0 0 110 20">` +
        `<polyline points="${points}" fill="none" stroke="${zone.color}" stroke-width="1.5" stroke-linecap="round"/>` +
        `<circle cx="${(currentHour / 23) * 110}" cy="${dotY}" r="2.5" fill="${zone.color}" stroke="white" stroke-width="0.8"/>` +
        `</svg></div>`

      const cardIcon = L.divIcon({ className: '', html, iconSize: [0, 0] })
      const cardMarker = L.marker([cardLat, cardLng], { icon: cardIcon, interactive: true }).addTo(map)
      cardMarker.on('click', () => onZoneTap(zone))
      cardsRef.current.push(cardMarker)
    })
  }, [layers, darkMode, currentHour, showAnalytics, onZoneTap])

  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.8 })
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <button
        onClick={recenter}
        aria-label="recenter"
        style={{
          position: 'absolute',
          bottom: 180,
          right: 14,
          zIndex: 1000,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: darkMode ? 'rgba(10,10,18,0.92)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${darkMode ? 'rgba(42,42,64,0.8)' : 'rgba(0,0,0,0.1)'}`,
          color: darkMode ? 'var(--d2c-text)' : '#333',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          fontFamily: 'inherit',
        }}
      >
        ⌖
      </button>
    </div>
  )
}
