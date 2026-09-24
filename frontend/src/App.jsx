import { useCallback, useEffect, useState } from 'react'
import { Activity, Bell, ChevronDown, Crosshair, Menu, Radio, Siren, Wifi } from 'lucide-react'
import MapView from './components/Map.jsx'
import IncidentForm from './components/IncidentForm.jsx'
import Analytics from './components/Analytics.jsx'
import { api, connectTelemetry } from './services/websocket.js'

export default function App() {
  const [telemetry, setTelemetry] = useState(null)
  const [connected, setConnected] = useState(false)
  const [pin, setPin] = useState(null)
  const [showAlerts, setShowAlerts] = useState(false)
  const [alerts, setAlerts] = useState([])

  const refresh = useCallback(async () => {
    try {
      const [telemetryData] = await Promise.all([api('/telemetry')])
      setTelemetry(telemetryData)
    } catch { /* WebSocket reconnect state is visible in the header. */ }
  }, [])

  useEffect(() => {
    refresh()
    return connectTelemetry(data => { setTelemetry(data); setAlerts(data.alerts || []) }, setConnected)
  }, [refresh])

  const metrics = telemetry?.metrics
  const signalCount = telemetry?.signals?.filter(s => s.status === 'PREEMPTED').length || 0
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Activity size={19} /></span><span>PULSE<span className="brand-dot">.</span><small>EMERGENCY NETWORK</small></span></a><nav><a className="nav-active" href="#operations">Operations</a><a href="#analytics">Analytics</a><a href="#incidents">Incident log</a></nav><div className="top-actions"><span className={`connection-state ${connected ? '' : 'offline'}`}><i />{connected ? 'SYSTEM LIVE' : 'CONNECTING'}</span><button className="icon-button alert-button" aria-label="Alerts" onClick={() => setShowAlerts(!showAlerts)}><Bell size={18} />{alerts.length > 0 && <b>{alerts.length}</b>}</button>{showAlerts && <div className="alerts-popover"><strong>Active alerts</strong>{alerts.length ? alerts.map((a, i) => <p key={`${a.signal_id}-${i}`}>{a.message}</p>) : <p>No active preemption alerts.</p>}</div>}<button className="profile-button">OPS <ChevronDown size={14} /></button><button className="mobile-menu" aria-label="Menu"><Menu /></button></div></header>
    <main id="top"><div className="page-intro"><div><div className="breadcrumb">CITY OPERATIONS <span>/</span> EMERGENCY RESPONSE</div><h1>Traffic command <span>center</span></h1><p>Live emergency vehicle preemption and incident monitoring</p></div><div className="dispatch-status"><span className="dispatch-symbol"><Radio size={18} /></span><div><small>DISPATCH STATUS</small><strong>{connected ? 'Network operational' : 'Connecting to network'}</strong></div><span className="status-chevron">⌄</span></div></div>
      <section id="operations" className="operations-grid"><div className="panel map-panel"><div className="map-toolbar"><div className="map-title"><span className="eyebrow">LIVE CITY GRID</span><h2><Crosshair size={18} /> Bengaluru central</h2></div><div className="map-tags"><span><i className="tag-dot red" /> Ambulance en route</span><span><i className="tag-dot green" /> {signalCount} signals preempted</span></div></div><div className="map-wrap"><MapView telemetry={telemetry} onMapClick={setPin} /><div className="map-legend"><b>ROUTE DENSITY</b><span><i className="density-low" /> Low</span><span><i className="density-medium" /> Medium</span><span><i className="density-high" /> High</span></div><div className="map-live"><span className="live-dot" /> LIVE TRACKING</div></div><div className="map-footer"><span><Siren size={14} /> {telemetry?.ambulance?.id || 'AMB-01'} · {telemetry?.ambulance?.status || 'EMERGENCY'}</span><span><Wifi size={14} /> GPS {connected ? 'ACCURACY 8M' : 'WAITING'}</span><span>Target signal <b>{telemetry?.ambulance?.target_signal_id || '—'}</b></span><span className="map-footer-right">Click map to place incident pin</span></div></div>
        <div id="incidents"><IncidentForm pin={pin} incidents={telemetry?.incidents || []} onCreated={incident => { setTelemetry(prev => prev ? { ...prev, incidents: [incident, ...(prev.incidents || [])] } : prev); setPin(null); refresh() }} /></div></section>
      <div id="analytics"><Analytics metrics={metrics} connected={connected} /></div>
      <footer><span><Activity size={14} /> PULSE CITY RESPONSE PLATFORM</span><span>SIMULATION MODE · MOCK DATA · NO EXTERNAL SERVICES</span><span>v1.0.0</span></footer>
    </main>
  </div>
}
