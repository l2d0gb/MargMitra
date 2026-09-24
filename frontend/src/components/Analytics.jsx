import { Activity, ArrowDownRight, Clock3, ShieldCheck, Siren } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function MetricCard({ label, value, detail, icon: Icon, accent, trend }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}><Icon size={17} /></span></div><strong>{value}</strong><div className="metric-detail">{trend && <ArrowDownRight size={14} />}{detail}</div></article>
}

export default function Analytics({ metrics, connected }) {
  const data = metrics?.response_trend || []
  return <section className="analytics-section">
    <div className="section-heading"><div><span className="eyebrow">NETWORK PERFORMANCE</span><h2>Response analytics</h2></div><span className={`live-pill ${connected ? '' : 'offline'}`}><i />{connected ? 'LIVE SIMULATION' : 'RECONNECTING'}</span></div>
    <div className="metric-grid">
      <MetricCard label="Response time saved" value="8.1 min" detail="14.2 min → 6.1 min average" icon={Clock3} accent="orange" trend />
      <MetricCard label="Corridor reliability" value={`${metrics?.green_corridor_reliability_index ?? 91.4}%`} detail="Green signal availability" icon={ShieldCheck} accent="green" />
      <MetricCard label="Active incidents" value={metrics?.active_incidents ?? 0} detail={`${metrics?.preemption_events ?? 0} corridor activations`} icon={Siren} accent="red" />
      <MetricCard label="Traffic density" value={`${Math.round((metrics?.active_congestion_level ?? 0.42) * 100)}%`} detail="Two-wheeler congestion index" icon={Activity} accent="blue" />
    </div>
    <div className="panel chart-panel"><div className="chart-heading"><div><span className="eyebrow">SIMULATED RESPONSE RUNS</span><h3>Dispatch-to-arrival time</h3></div><div className="chart-legend"><i /> Average minutes</div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 16, right: 16, bottom: 2, left: -14 }}><CartesianGrid stroke="#233248" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="run" tickFormatter={v => `Run ${v}`} tick={{ fill: '#77869b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 'dataMax + 3']} tick={{ fill: '#77869b', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#101c2c', border: '1px solid #27364b', borderRadius: 10, color: '#eff4fa' }} formatter={value => [`${value} min`, 'Response time']} labelFormatter={label => `Simulation run ${label}`} /><Line type="monotone" dataKey="minutes" stroke="#53d4a1" strokeWidth={3} dot={{ fill: '#53d4a1', stroke: '#0c1827', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></div>
  </section>
}
