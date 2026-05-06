import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, FolderOpen, AlertCircle } from 'lucide-react';

export default function CrossCaseSearch({ onSelectCase }) {
  const { authFetch } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await authFetch(`/api/search/cross-case?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      setResults(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search hash, phone, email, plate, name, device ID…"
          className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button type="submit" disabled={loading || query.trim().length < 3}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Search size={14} /> {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            {results.total} match{results.total !== 1 ? 'es' : ''} for <span className="text-cyan-400 font-mono">"{results.query}"</span>
          </p>
          {results.hits.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No matches found across any case.</p>
          ) : results.hits.map((hit, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {hit.match_type === 'evidence'
                  ? <FileText size={13} className="text-cyan-400" />
                  : <FolderOpen size={13} className="text-purple-400" />}
                <span className="font-mono text-xs text-cyan-400">{hit.case_number}</span>
                <span className="text-xs text-slate-300">{hit.case_title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{hit.match_type}</span>
              </div>
              {hit.exhibit_ref && <p className="text-xs text-slate-400">Exhibit: <span className="text-slate-300">{hit.exhibit_ref}</span> — {hit.filename}</p>}
              {hit.report_number && <p className="text-xs text-slate-400">Report: <span className="text-slate-300">{hit.report_number}</span></p>}
              {hit.snippet && <p className="text-xs font-mono text-slate-500 bg-slate-900/50 rounded p-2 mt-1 break-all">{hit.snippet}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
