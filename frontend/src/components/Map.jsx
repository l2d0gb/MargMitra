import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const center = [12.9716, 77.5963]
const icon = L.divIcon({ className: 'ambulance-marker', html: '<span>＋</span>', iconSize: [34, 34], iconAnchor: [17, 17] })

function MapClick({ onMapClick }) {
  useMapEvents({ click(event) { onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng }) } })
  return null
}

function FitRoute({ route }) {
  const map = useMapEvents({})
  useEffect(() => { if (route?.length) map.fitBounds(route.map(p => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 16 }) }, [route, map])
  return null
}

export default function MapView({ telemetry, onMapClick }) {
  const ambulance = telemetry?.ambulance
  const route = ambulance?.route_points || []
  const colors = { LOW: '#25d69a', MEDIUM: '#ffb84d', HIGH: '#ff5964' }
  return <MapContainer center={center} zoom={15} scrollWheelZoom className="map-canvas">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapClick onMapClick={onMapClick} />
    <FitRoute route={route} />
    {(telemetry?.route_density || []).map((segment, index) => <Polyline key={`density-${index}`} positions={[[segment.from.lat, segment.from.lng], [segment.to.lat, segment.to.lng]]} pathOptions={{ color: colors[segment.density], weight: 7, opacity: 0.75 }} />)}
    {telemetry?.signals?.map(signal => <CircleMarker key={signal.id} center={[signal.lat, signal.lng]} radius={signal.status === 'PREEMPTED' ? 10 : 8} pathOptions={{ color: signal.status === 'RED' ? '#ff5964' : '#25d69a', fillColor: signal.status === 'RED' ? '#ff5964' : '#25d69a', fillOpacity: 1, weight: 2 }}><Popup><b>{signal.id}</b><br />{signal.status} · {signal.distance_to_ambulance} m away</Popup></CircleMarker>)}
    {telemetry?.incidents?.map(incident => <span key={incident.id}><CircleMarker center={[incident.lat, incident.lng]} radius={7 + incident.severity * 2} pathOptions={{ color: '#ff5964', fillColor: '#ff5964', fillOpacity: 0.7, className: 'incident-pulse' }}><Popup><b>Severity {incident.severity}</b><br />{incident.verified ? 'Verified' : 'Awaiting verification'}<br />Priority score: {incident.priority_score}</Popup></CircleMarker>{incident.severity > 3 && <Circle center={[incident.lat, incident.lng]} radius={incident.impact_radius_m || 1000} pathOptions={{ color: '#ff5964', fillColor: '#ff5964', fillOpacity: 0.08, weight: 1, dashArray: '5 8' }} />}</span>)}
    {ambulance && <CircleMarker center={[ambulance.lat, ambulance.lng]} icon={icon} radius={12} pathOptions={{ color: '#fff', fillColor: '#fb5e53', fillOpacity: 1, weight: 3 }}><Popup><b>{ambulance.id}</b><br />Emergency response · {ambulance.speed} km/h<br />Target: {ambulance.target_signal_id || 'none'}</Popup></CircleMarker>}
  </MapContainer>
}
