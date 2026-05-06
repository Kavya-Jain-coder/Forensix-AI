import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Square, Plus, X } from 'lucide-react';

const PRESET_TASKS = [
  'OCR needs review',
  'Verify evidence integrity',
  'Generate report',
  'Reviewer requested changes',
  'Export final bundle',
];

export default function TasksPanel({ caseId }) {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () =>
    authFetch(`/api/cases/${caseId}/tasks`).then(r => r.json()).then(setTasks).catch(console.error);

  useEffect(() => { load(); }, [caseId]);

  const addTask = async (title) => {
    if (!title.trim()) return;
    const form = new FormData();
    form.append('title', title.trim());
    const res = await authFetch(`/api/cases/${caseId}/tasks`, { method: 'POST', body: form });
    const task = await res.json();
    setTasks(prev => [...prev, task]);
    setNewTitle('');
    setAdding(false);
  };

  const toggle = async (taskId) => {
    const res = await authFetch(`/api/cases/${caseId}/tasks/${taskId}`, { method: 'PATCH' });
    const updated = await res.json();
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
  };

  const done = tasks.filter(t => t.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{done}/{tasks.length} complete</span>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          <Plus size={13} /> Add task
        </button>
      </div>

      {adding && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask(newTitle)}
              placeholder="Task title…"
              className="flex-1 px-2 py-1.5 bg-slate-900/60 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
            <button onClick={() => addTask(newTitle)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs transition-colors">Add</button>
            <button onClick={() => setAdding(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESET_TASKS.map(p => (
              <button key={p} onClick={() => addTask(p)}
                className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && !adding ? (
        <p className="text-xs text-slate-600 text-center py-4">No tasks yet.</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => (
            <div key={t.id} onClick={() => toggle(t.id)}
              className="flex items-center gap-2 text-xs cursor-pointer group">
              {t.done
                ? <CheckSquare size={14} className="text-green-400 flex-shrink-0" />
                : <Square size={14} className="text-slate-500 group-hover:text-slate-300 flex-shrink-0" />}
              <span className={t.done ? 'line-through text-slate-600' : 'text-slate-300'}>{t.title}</span>
              {t.created_by_name && <span className="text-slate-600 ml-auto">{t.created_by_name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
