import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users, ShieldCheck, Clock, X, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

const roleColors = {
  admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  forensic_officer: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  investigator: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  reviewer: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage users and cases' },
  { value: 'forensic_officer', label: 'Forensic Officer', desc: 'Generate and edit reports' },
  { value: 'investigator', label: 'Investigator', desc: 'Upload evidence' },
  { value: 'reviewer', label: 'Reviewer', desc: 'Approve or reject reports' },
];

const emptyForm = {
  username: '', email: '', full_name: '', password: '',
  role: 'investigator', badge_number: '', department: '',
};

export default function AdminPanel() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
  }, []);

  const loadUsers = () =>
    authFetch('/api/auth/users').then(r => r.json()).then(setUsers)
      .catch(console.error).finally(() => setLoading(false));

  const loadAuditLogs = () =>
    authFetch('/api/audit?limit=50').then(r => r.json()).then(setAuditLogs).catch(console.error);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setCreating(true); setError(''); setSuccess('');
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          badge_number: form.badge_number || undefined,
          department: form.department || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const newUser = await res.json();
      setUsers(prev => [...prev, newUser]);
      setForm(emptyForm);
      setShowAddUser(false);
      setSuccess(`User "${newUser.username}" created successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (userId, username) => {
    if (!confirm(`Deactivate user "${username}"? They will no longer be able to log in.`)) return;
    const res = await authFetch(`/api/auth/users/${userId}/deactivate`, { method: 'PATCH' });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
    }
  };

  // Group login events by user for "who has logged in"
  const loginLogs = auditLogs.filter(l => l.action === 'user_login');
  const recentLogins = loginLogs.reduce((acc, log) => {
    if (!acc[log.user_id]) acc[log.user_id] = log;
    return acc;
  }, {});

  const getUserById = (id) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          <p className="text-slate-400 text-sm mt-1">Manage users, roles, and monitor activity</p>
        </div>
        <button
          onClick={() => { setShowAddUser(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle size={15} className="text-green-400" />
          <p className="text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-blue-400' },
          { label: 'Active', value: users.filter(u => u.is_active).length, color: 'text-green-400' },
          { label: 'Inactive', value: users.filter(u => !u.is_active).length, color: 'text-red-400' },
          { label: 'Recent Logins', value: Object.keys(recentLogins).length, color: 'text-cyan-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700 w-fit">
        {[
          { key: 'users', label: `All Users (${users.length})`, icon: Users },
          { key: 'logins', label: `Recent Logins (${loginLogs.length})`, icon: Clock },
          { key: 'audit', label: 'Audit Log', icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {loading ? <p className="text-slate-400 text-sm">Loading users...</p> : users.map(u => (
            <div key={u.id} className={`bg-slate-800/50 rounded-xl border p-4 flex items-center justify-between gap-4 ${u.is_active ? 'border-slate-700' : 'border-slate-700/40 opacity-60'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{u.full_name}</span>
                    <span className="text-xs text-slate-500 font-mono">@{u.username}</span>
                    {u.badge_number && <span className="text-xs text-slate-500">#{u.badge_number}</span>}
                    {!u.is_active && <span className="text-xs px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[u.role] || 'text-slate-400'}`}>
                      {u.role.replace('_', ' ').toUpperCase()}
                    </span>
                    {u.department && <span className="text-xs text-slate-500">{u.department}</span>}
                    <span className="text-xs text-slate-600">{u.email}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Added {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {recentLogins[u.id] && (
                      <span className="ml-2 text-green-500">
                        · Last login {new Date(recentLogins[u.id].timestamp).toLocaleString()}
                      </span>
                    )}
                    {!recentLogins[u.id] && u.is_active && <span className="ml-2 text-slate-600">· Never logged in</span>}
                  </p>
                </div>
              </div>
              {u.is_active && (
                <button onClick={() => handleDeactivate(u.id, u.username)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs transition-colors flex-shrink-0">
                  <XCircle size={13} /> Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Logins Tab */}
      {activeTab === 'logins' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-3">Shows all login events. Users with a recent login are currently or were recently active.</p>
          {loginLogs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No login events recorded yet.</p>
          ) : loginLogs.map(log => {
            const u = getUserById(log.user_id);
            return (
              <div key={log.id} className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {u?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <span className="text-sm text-white font-medium">{u?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-500 ml-2">@{u?.username || log.user_id?.slice(0, 8)}</span>
                    {u && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full border ${roleColors[u.role]}`}>{u.role.replace('_', ' ')}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-300">{new Date(log.timestamp).toLocaleString()}</p>
                  {log.ip_address && <p className="text-xs text-slate-600">{log.ip_address}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No audit events yet.</p>
          ) : auditLogs.map(log => {
            const u = getUserById(log.user_id);
            return (
              <div key={log.id} className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded flex-shrink-0">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-300 truncate">{u?.full_name || 'System'}</span>
                  {log.case_id && <span className="text-slate-500 truncate">Case: {log.case_id.slice(0, 8)}…</span>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                  {log.ip_address && <p className="text-slate-600">{log.ip_address}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Add New User</h3>
              <button onClick={() => { setShowAddUser(false); setError(''); }} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button type="button" key={r.value}
                      onClick={() => setForm(p => ({ ...p, role: r.value }))}
                      className={`p-3 rounded-lg border text-left transition-colors ${form.role === r.value ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                      <p className={`text-xs font-semibold ${roleColors[r.value]?.split(' ')[0] || 'text-slate-300'}`}>{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'full_name', label: 'Full Name *', placeholder: 'e.g. Dr. Sarah Collins', required: true },
                { key: 'username', label: 'Username *', placeholder: 'e.g. sarah.collins', required: true },
                { key: 'email', label: 'Email *', placeholder: 'e.g. s.collins@forensix.gov', required: true, type: 'email' },
                { key: 'badge_number', label: 'Badge / Staff Number', placeholder: 'e.g. FSO-4821' },
                { key: 'department', label: 'Department', placeholder: 'e.g. DNA Analysis Unit' },
              ].map(({ key, label, placeholder, required, type }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input type={type || 'text'} required={required} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required
                    placeholder="Minimum 8 characters"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs p-2 bg-red-500/10 border border-red-500/20 rounded">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddUser(false); setError(''); }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
