import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const levelIcon = {
  info: <Info size={13} className="text-blue-400" />,
  warning: <AlertCircle size={13} className="text-yellow-400" />,
  error: <AlertCircle size={13} className="text-red-400" />,
  success: <CheckCircle size={13} className="text-green-400" />,
};

export default function NotificationsPanel() {
  const { authFetch } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () =>
      authFetch('/api/notifications').then(r => r.json()).then(setNotifs).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [authFetch]);

  const markRead = async (id) => {
    await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
            {notifs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No notifications</p>
            ) : notifs.map(n => (
              <div key={n.id}
                className={`flex items-start gap-3 px-4 py-3 text-xs cursor-pointer hover:bg-slate-700/40 transition-colors ${n.read ? 'opacity-50' : ''}`}
                onClick={() => !n.read && markRead(n.id)}>
                <div className="mt-0.5 flex-shrink-0">{levelIcon[n.level] || levelIcon.info}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 leading-snug">{n.message}</p>
                  <p className="text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
