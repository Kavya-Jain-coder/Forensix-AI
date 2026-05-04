import { useState, useEffect } from 'react';
import { useAuth, canGenerate, canReview, isAdmin } from '../context/AuthContext';
import { Plus, Search, Filter, FolderOpen, Clock, AlertCircle, CheckCircle, FileText, Upload, Eye } from 'lucide-react';

const statusConfig = {
  open: { label: 'Open', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  closed: { label: 'Closed', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  archived: { label: 'Archived', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

const reportStatusConfig = {
  none:             { label: 'No Report',        color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  ai_draft:         { label: 'AI Draft',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  under_review:     { label: 'Under Review',      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  needs_correction: { label: 'Needs Correction',  color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  approved:         { label: 'Approved',           color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  exported:         { label: 'Exported',           color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

const priorityConfig = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const CASE_TYPES = ['homicide','cybercrime','fraud','narcotics','missing_person','sexual_assault','robbery','terrorism','other'];
const PRIORITIES = ['critical','high','medium','low'];
const STATUSES = ['open','under_review','closed','archived'];

export default function CaseDashboard({ onSelectCase }) {
  const { user, authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', case_type: 'other', priority: 'medium', fir_number: '', investigating_agency: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadCases(); }, [search, filterStatus, filterPriority, filterType]);

  const loadCases = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterType) params.set('case_type', filterType);
    authFetch(`/api/cases?${params}`).then(r => r.json()).then(setCases)
      .catch(console.error).finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      const res = await authFetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const c = await res.json();
      setCases(p => [c, ...p]);
      setShowCreate(false);
      setForm({ title: '', description: '', case_type: 'other', priority: 'medium', fir_number: '', investigating_agency: '' });
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  };

  // Role-specific header message
  const roleHint = {
    admin: 'Full access — manage all cases, users, and audit logs.',
    forensic_officer: 'Your queue: cases awaiting evidence analysis and report generation.',
    investigator: 'Your cases: upload evidence and create new cases.',
    reviewer: 'Your queue: reports awaiting your review and approval.',
  }[user?.role] || '';

  const pendingReports = cases.filter(c => c.report_status_summary === 'under_review');
  const awaitingEvidence = cases.filter(c => c.evidence_count === 0);
  const approvedReports = cases.filter(c => c.report_status_summary === 'approved' || c.report_status_summary === 'exported');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Case Dashboard</h2>
          <p className="text-slate-400 text-xs mt-0.5">{roleHint}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all flex-shrink-0">
          <Plus size={15} /> New Case
        </button>
      </div>

      {/* Role-specific stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases', value: cases.length, icon: FolderOpen, color: 'text-blue-400' },
          { label: 'Open', value: cases.filter(c => c.status === 'open').length, icon: Clock, color: 'text-green-400' },
          { label: isAdmin(user) ? 'Awaiting Review' : canReview(user) ? 'Awaiting Review' : 'Reports Generated', value: pendingReports.length, icon: FileText, color: 'text-yellow-400' },
          { label: isAdmin(user) ? 'No Evidence Yet' : 'No Evidence Yet', value: awaitingEvidence.length, icon: Upload, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-3 flex items-center gap-3">
            <Icon size={18} className={color} />
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search by case number, title, FIR, agency..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
        </div>
        {[
          { value: filterStatus, set: setFilterStatus, options: STATUSES, placeholder: 'Status' },
          { value: filterPriority, set: setFilterPriority, options: PRIORITIES, placeholder: 'Priority' },
          { value: filterType, set: setFilterType, options: CASE_TYPES, placeholder: 'Type' },
        ].map(({ value, set, options, placeholder }) => (
          <select key={placeholder} value={value} onChange={e => set(e.target.value)}
            className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
            <option value="">{placeholder}: All</option>
            {options.map(o => <option key={o} value={o}>{o.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        ))}
      </div>

      {/* Cases — table on desktop, cards on mobile */}
      {loading ? (
        <p className="text-slate-400 text-sm text-center py-8">Loading cases...</p>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
          <FolderOpen size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No cases found. {search || filterStatus ? 'Try clearing filters.' : 'Create your first case.'}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {cases.map(c => {
              const st = statusConfig[c.status] || statusConfig.open;
              const pr = priorityConfig[c.priority] || priorityConfig.medium;
              const rs = reportStatusConfig[c.report_status_summary] || reportStatusConfig.none;
              return (
                <div key={c.id} onClick={() => onSelectCase(c)}
                  className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 cursor-pointer active:bg-slate-700/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{c.title}</p>
                      <p className="text-xs text-slate-500 font-mono">{c.case_number}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${pr}`}>{c.priority?.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rs.color}`}>{rs.label}</span>
                    <span className="text-xs text-slate-500">{c.evidence_count} evidence</span>
                  </div>
                  {isAdmin(user) && c.created_by_name && (
                    <p className="text-xs text-slate-500 mt-2">By: {c.created_by_name}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Case</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5">Priority</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  {isAdmin(user) && <th className="text-left px-4 py-2.5">Created By</th>}
                  <th className="text-left px-4 py-2.5">Evidence</th>
                  <th className="text-left px-4 py-2.5">Report Status</th>
                  <th className="text-left px-4 py-2.5 hidden xl:table-cell">Created</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {cases.map(c => {
                  const st = statusConfig[c.status] || statusConfig.open;
                  const pr = priorityConfig[c.priority] || priorityConfig.medium;
                  return (
                    <tr key={c.id} className="hover:bg-slate-700/30 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">{c.title}</p>
                        <p className="text-xs text-slate-500 font-mono">{c.case_number}{c.fir_number ? ` · FIR: ${c.fir_number}` : ''}</p>
                        {c.investigating_agency && <p className="text-xs text-slate-600">{c.investigating_agency}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-400">{c.case_type?.replace('_', ' ').toUpperCase() || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pr}`}>{c.priority?.toUpperCase() || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      {isAdmin(user) && (
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-300">{c.created_by_name || '—'}</span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {c.evidence_count === 0
                          ? <span className="text-xs text-red-400">None</span>
                          : <span className="text-xs text-slate-300">{c.evidence_count} file{c.evidence_count > 1 ? 's' : ''}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const rs = reportStatusConfig[c.report_status_summary] || reportStatusConfig.none;
                          return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rs.color}`}>{rs.label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-slate-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => onSelectCase(c)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded text-xs transition-colors">
                          <Eye size={12} /> Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Case Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Create New Case</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Case Title *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Operation Nightfall — Homicide Investigation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Case Type</label>
                  <select value={form.case_type} onChange={e => setForm(p => ({ ...p, case_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                    {CASE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">FIR / Reference Number</label>
                  <input type="text" value={form.fir_number}
                    onChange={e => setForm(p => ({ ...p, fir_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. FIR-2024-00142" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Investigating Agency</label>
                  <input type="text" value={form.investigating_agency}
                    onChange={e => setForm(p => ({ ...p, investigating_agency: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. CBI, State Police" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="Brief case description..." />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
