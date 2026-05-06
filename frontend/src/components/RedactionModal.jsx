import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Scissors, Download, AlertCircle } from 'lucide-react';

export default function RedactionModal({ caseId, report, onClose }) {
  const { authFetch } = useAuth();
  const [opts, setOpts] = useState({ phones: true, emails: true, postcodes: false });
  const [customTerms, setCustomTerms] = useState('');
  const [redacted, setRedacted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRedact = async () => {
    setLoading(true); setError('');
    const form = new FormData();
    form.append('redact_phones', opts.phones);
    form.append('redact_emails', opts.emails);
    form.append('redact_postcodes', opts.postcodes);
    if (customTerms.trim()) form.append('custom_terms', customTerms.trim());
    try {
      const res = await authFetch(`/api/cases/${caseId}/reports/${report.id}/redact`, { method: 'POST', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const data = await res.json();
      setRedacted(data.redacted_report_data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(redacted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report.report_number?.replace(/\//g, '-')}-redacted.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2"><Scissors size={16} /> Redaction Mode</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <p className="text-xs text-slate-400">
          Select what to redact from <span className="text-cyan-400 font-mono">{report.report_number}</span> before sharing.
        </p>

        <div className="space-y-2">
          {[
            { key: 'phones', label: 'Phone numbers' },
            { key: 'emails', label: 'Email addresses' },
            { key: 'postcodes', label: 'Postcodes / ZIP codes' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" checked={opts[key]} onChange={e => setOpts(p => ({ ...p, [key]: e.target.checked }))}
                className="accent-cyan-500" />
              {label}
            </label>
          ))}
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Custom terms to redact (comma-separated)</label>
          <input value={customTerms} onChange={e => setCustomTerms(e.target.value)}
            placeholder="e.g. John Smith, 07700 900000"
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {redacted && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-300 space-y-2">
            <p>✓ Redaction applied. Download the redacted report data below.</p>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors">
              <Download size={13} /> Download Redacted JSON
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleRedact} disabled={loading}
            className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
            {loading ? 'Redacting…' : 'Apply Redaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
