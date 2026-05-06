import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Printer, QrCode } from 'lucide-react';

export default function EvidenceLabelModal({ caseId, evidence, onClose }) {
  const { authFetch } = useAuth();
  const [labels, setLabels] = useState({});

  useEffect(() => {
    evidence.forEach(ev => {
      authFetch(`/api/cases/${caseId}/evidence/${ev.id}/label`)
        .then(r => r.json())
        .then(data => setLabels(prev => ({ ...prev, [ev.id]: data })))
        .catch(console.error);
    });
  }, [caseId, evidence]);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2"><QrCode size={16} /> Evidence Labels</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-medium transition-colors">
              <Printer size={13} /> Print All
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 print:space-y-8">
          {evidence.map(ev => {
            const label = labels[ev.id];
            return (
              <div key={ev.id}
                className="bg-slate-900/60 border-2 border-slate-600 rounded-xl p-4 print:border-black print:bg-white print:text-black">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-cyan-400 print:text-black">
                        {label?.exhibit_ref || ev.exhibit_ref}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                        label?.integrity_status === 'VERIFIED' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                        label?.integrity_status === 'TAMPERED' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                        'text-slate-400 border-slate-600 bg-slate-700/50'
                      }`}>
                        {label?.integrity_status || 'PENDING'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{label?.case_number}</p>
                    <p className="text-xs text-slate-300">{label?.case_title}</p>
                    <p className="text-xs text-slate-400 mt-2">{label?.filename}</p>
                    <p className="text-xs text-slate-500">{label?.file_type} · {label?.file_size_kb} KB</p>
                    <p className="text-xs text-slate-500">
                      Uploaded: {label?.uploaded_at ? new Date(label.uploaded_at).toLocaleString() : '—'}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-0.5">SHA-256</p>
                      <p className="text-xs font-mono text-slate-400 break-all">{label?.sha256}</p>
                    </div>
                  </div>
                  {/* QR placeholder — shows the QR content as monospace since we have no QR lib */}
                  <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg flex items-center justify-center border border-slate-600">
                    <div className="text-center p-1">
                      <QrCode size={40} className="text-slate-800 mx-auto" />
                      <p className="text-[8px] text-slate-600 mt-1 break-all leading-tight">
                        {label?.qr_content?.slice(-20)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
