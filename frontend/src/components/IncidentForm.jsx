import { useState } from 'react'
import { AlertTriangle, MapPin, ShieldCheck } from 'lucide-react'
import { api } from '../services/websocket'

export default function IncidentForm({ pin, onCreated, incidents = [] }) {
  const [severity, setSeverity] = useState(3)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('before')
  const [selectedId, setSelectedId] = useState('')
  const [lat, setLat] = useState('12.9744')
  const [lng, setLng] = useState('77.5968')
  const location = pin || { lat: Number(lat), lng: Number(lng) }

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      const incident = await api('/incidents', { method: 'POST', body: JSON.stringify({ lat: location.lat, lng: location.lng, severity }) })
      onCreated?.(incident); setSelectedId(incident.id); setMessage('Incident added to live response queue.')
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  async function toggleVerification() {
    const target = selectedId || incidents[0]?.id
    if (!target) { setMessage('Report an incident first to record verification.') ; return }
    const incident = incidents.find(item => item.id === target)
    try {
      await api('/verify-incident', { method: 'POST', body: JSON.stringify({ incident_id: target, verified: !incident?.verified }) })
      setMode(incident?.verified ? 'before' : 'after')
      setMessage(incident?.verified ? 'Verification reset.' : 'Incident verified. Preemption response recorded.')
    } catch (error) { setMessage(error.message) }
  }

  return <section className="panel incident-panel">
    <div className="panel-title"><div><span className="eyebrow">FIELD REPORT</span><h2>New incident</h2></div><span className="title-icon"><AlertTriangle size={18} /></span></div>
    <p className="subtle">Drop a pin on the map or enter coordinates to dispatch a response.</p>
    <form onSubmit={submit} className="incident-form">
      <div className="pin-readout"><MapPin size={15} /><span>{pin ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} · map pin` : 'Default location'}</span></div>
      {!pin && <div className="coordinate-row"><label>Latitude<input value={lat} onChange={e => setLat(e.target.value)} type="number" step="any" required /></label><label>Longitude<input value={lng} onChange={e => setLng(e.target.value)} type="number" step="any" required /></label></div>}
      <label className="field-label">Severity <strong>{severity} / 5</strong><input className="severity-slider" type="range" min="1" max="5" value={severity} onChange={e => setSeverity(Number(e.target.value))} /></label>
      <div className="severity-scale"><span>Minor</span><span>Critical</span></div>
      <button className="primary-button" disabled={busy}>{busy ? 'Submitting…' : '＋  Report incident'}</button>
    </form>
    <div className="verification-box"><div className="verification-heading"><span className="eyebrow">RESPONSE VERIFICATION</span><button onClick={toggleVerification} className={`verification-toggle ${mode}`}><span />{mode === 'after' ? 'After' : 'Before'}</button></div><div className="comparison"><div><small>Before preemption</small><strong>14.2 <i>min</i></strong></div><span className="comparison-arrow">→</span><div><small>With green corridor</small><strong className="green-text">6.1 <i>min</i></strong></div></div><p><ShieldCheck size={13} /> Verify an incident to record the before / after response state.</p></div>
    {message && <div className="form-message" role="status">{message}</div>}
  </section>
}
