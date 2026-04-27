import L from 'leaflet'

function pinColor(activeUsers: number): string {
  if (activeUsers >= 21) return '#ef4444'
  if (activeUsers >= 6) return '#8b5cf6'
  return '#06d6a0'
}

export function makeHotspotIcon(activeUsers: number, label: string): L.DivIcon {
  const color = pinColor(activeUsers)
  const isHot = activeUsers >= 21
  const size = isHot ? 16 : 12

  return L.divIcon({
    className: '',
    iconSize: [48, 60],
    iconAnchor: [24, 30],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;--pin-color:${color}">
        <div style="position:absolute;top:50%;left:50%;width:28px;height:28px;border-radius:50%;border:1.5px solid ${color};transform:translate(-50%,-50%);animation:pin-pulse 2.5s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;width:28px;height:28px;border-radius:50%;border:1.5px solid ${color};transform:translate(-50%,-50%);animation:pin-pulse 2.5s ease-out 0.8s infinite;"></div>
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;position:relative;z-index:2;
          background:radial-gradient(circle at 35% 35%,${color},color-mix(in srgb,${color} 60%,black));
          box-shadow:0 0 14px ${color},0 0 4px ${color};
          border:2px solid rgba(255,255,255,0.2);
        ">${isHot ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};animation:pin-pulse 1.5s ease-out infinite;"></div>` : ''}</div>
        <div style="
          margin-top:4px;
          background:rgba(10,10,18,0.92);
          backdrop-filter:blur(10px);
          border:1px solid ${color}4d;
          border-radius:20px;
          padding:2px 8px;
          display:flex;align-items:center;gap:3px;
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
          white-space:nowrap;
          font-size:10px;
          font-family:'JetBrains Mono',monospace;
          font-weight:600;
          color:${color};
        ">${label}</div>
      </div>`,
  })
}

export function makeYouIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
        <div style="
          position:absolute;width:36px;height:36px;border-radius:50%;
          background:#8b5cf6;opacity:0.2;
          animation:you-breathe 2s ease-in-out infinite;
        "></div>
        <div style="
          width:18px;height:18px;border-radius:50%;
          background:linear-gradient(135deg,#8b5cf6,#ff3cac);
          box-shadow:0 0 16px rgba(139,92,246,0.5);
          border:2.5px solid rgba(255,255,255,0.35);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
        ">
          <div style="width:5px;height:5px;border-radius:50%;background:#fff;"></div>
        </div>
      </div>`,
  })
}
