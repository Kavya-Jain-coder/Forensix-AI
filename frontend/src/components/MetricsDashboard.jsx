import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, AlertCircle } from 'lucide-react';

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  );
}

function BarList({ title, data, valueKey = 'count', labelKey = 'label' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-300 mb-3">{title}</p>
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 capitalize">{d[labelKey]?.replace(/_/g, ' ')}</span>
            <span className="text-slate-300 font-medium">{d[valueKey]}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MetricsDashboard() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    authFetch('/api/metrics').then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-slate-400 text-sm">Loading metrics...</p>;
  if (!data) return null;

  const statusData = Object.entries(data.cases_by_status).map(([label, count]) => ({ label, count }));
  const typeData = Object.entries(data.cases_by_type).map(([label, count]) => ({ label, count }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Department Metrics</span>
        <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw size={14} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Cases" value={data.total_cases} color="text-blue-400" />
        <Stat label="Total Reports" value={data.total_reports} color="text-cyan-400" />
        <Stat label="Pending Review" value={data.reports_pending_review} color="text-yellow-400" />
        <Stat label="Overdue Cases" value={data.overdue_cases} color={data.overdue_cases > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Evidence" value={data.total_evidence} />
        <Stat label="Integrity Failures" value={data.integrity_failures} color={data.integrity_failures > 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat label="Files Missing" value={data.file_missing} color={data.file_missing > 0 ? 'text-orange-400' : 'text-green-400'} />
        <Stat label="Avg Turnaround" value={data.avg_turnaround_hours != null ? `${data.avg_turnaround_hours}h` : '—'} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarList title="Cases by Status" data={statusData} valueKey="count" labelKey="label" />
        <BarList title="Cases by Type" data={typeData} valueKey="count" labelKey="label" />
      </div>

      {data.officer_workload.length > 0 && (
        <BarList
          title="Officer Workload (open cases)"
          data={data.officer_workload.map(o => ({ label: o.name, count: o.cases }))}
          valueKey="count" labelKey="label"
        />
      )}
    </div>
  );
}
