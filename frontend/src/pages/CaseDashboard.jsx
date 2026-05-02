import { useState, useEffect } from 'react';
import { useAuth, canGenerate, isAdmin } from '../context/AuthContext';
import { Plus, FolderOpen, Clock, CheckCircle, Archive, AlertCircle, Users } from 'lucide-react';

const statusConfig = {
  open: { label: 'Open', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  closed: { label: 'Closed', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  archived: { label: 'Archived', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

export default function CaseDashboard({ onSelectCase }) {
  const { user, authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/cases')
      .then(r => r.json())
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await authFetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const newCase = await res.json();
      setCases(prev => [newCase, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Case Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome, {user?.full_name} — {user?.role?.replace('_', ' ').toUpperCase()}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* Create Case Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Create New Case</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Case Title *</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Operation Nightfall — Homicide Investigation"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="Brief case description..."
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: cases.length, icon: FolderOpen, color: 'text-blue-400' },
          { label: 'Open', value: cases.filter(c => c.status === 'open').length, icon: Clock, color: 'text-green-400' },
          { label: 'Under Review', value: cases.filter(c => c.status === 'under_review').length, icon: AlertCircle, color: 'text-yellow-400' },
          { label: 'Closed', value: cases.filter(c => c.status === 'closed').length, icon: CheckCircle, color: 'text-slate-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl text-slate-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p>No cases yet. Create your first case to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map(c => {
            const st = statusConfig[c.status] || statusConfig.open;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className="bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-500 p-5 cursor-pointer transition-all hover:bg-slate-800/80 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-cyan-400">{c.case_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">{c.title}</h3>
                    {c.description && <p className="text-sm text-slate-400 mt-1 line-clamp-1">{c.description}</p>}
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 flex-shrink-0">
                    <span>{c.evidence_count} evidence</span>
                    <span>{c.report_count} reports</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">{new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
