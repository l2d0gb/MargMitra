const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_BASE = API_BASE.replace(/^http/, 'ws')

export function connectTelemetry(onMessage, onStatus = () => {}) {
  let socket
  let retryTimer
  let closed = false
  let delay = 1000

  const connect = () => {
    if (closed) return
    socket = new WebSocket(`${WS_BASE}/ws`)
    socket.onopen = () => { delay = 1000; onStatus(true) }
    socket.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data)) } catch (error) { console.error('Invalid telemetry payload', error) }
    }
    socket.onerror = () => socket.close()
    socket.onclose = () => {
      onStatus(false)
      if (!closed) { retryTimer = window.setTimeout(connect, delay); delay = Math.min(delay * 1.7, 10000) }
    }
  }
  connect()
  return () => { closed = true; window.clearTimeout(retryTimer); socket?.close() }
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${response.status})`)
  }
  return response.json()
}
