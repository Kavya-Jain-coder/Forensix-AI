import React from 'react';
import { Download, Copy, AlertCircle, CheckCircle } from 'lucide-react';

export default function ReportView({ report }) {
  const formatContent = (content) => {
    if (Array.isArray(content)) {
      return content.map((item) => `• ${item}`).join('\n');
    }
    return content;
  };

  const Section = ({ title, content }) => (
    <div className="mb-8">
      <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">{title}</h3>
      <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">{formatContent(content)}</div>
    </div>
  );

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur overflow-hidden animate-in fade-in duration-500">
      <div className="border-b border-slate-700 px-8 py-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <span className="text-sm font-medium text-white">Forensic Analysis Report</span>
           <span className={`px-2 py-1 rounded text-[10px] font-bold ${report.confidence_score > 70 ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'}`}>
             CONFIDENCE: {report.confidence_score}%
           </span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-white"><Copy size={18} /></button>
          <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-white"><Download size={18} /></button>
        </div>
      </div>

      <div className="p-8">
        <Section title="Case Summary" content={report.case_summary} />
        <Section title="Key Observations" content={report.observations} />
        <Section title="Technical Analysis" content={report.analysis} />
        <Section title="Evidence Limitations" content={report.limitations} />
        <Section title="Conclusion" content={report.conclusion} />

        <div className="mt-12 pt-8 border-t border-slate-700">
          <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Evidence Citations (RAG Retrieval)</h3>
          <div className="grid gap-4">
            {report.citations.map((cite, i) => (
              <div key={i} className="text-xs p-3 bg-slate-900/50 border border-slate-700 rounded-lg italic text-slate-300 hover:bg-slate-900/70 transition-colors">
                "{cite.content.substring(0, 200)}..."
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
