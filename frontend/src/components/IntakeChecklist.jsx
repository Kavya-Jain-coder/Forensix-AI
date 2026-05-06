import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function IntakeChecklist({ caseId }) {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    authFetch(`/api/cases/${caseId}/intake-checklist`)
      .then(r => r.json()).then(setData).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [caseId]);

  if (loading) return <p className="text-xs text-slate-500">Checking readiness...</p>;
  if (!data) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Evidence Intake Checklist</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${data.ready_for_export ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'}`}>
            {data.ready_for_export ? 'Ready' : 'Incomplete'}
          </span>
        </div>
        <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="space-y-1.5">
        {data.items.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            {item.done
              ? <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
              : <XCircle size={13} className="text-slate-600 flex-shrink-0" />}
            <span className={item.done ? 'text-slate-300' : 'text-slate-500'}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
