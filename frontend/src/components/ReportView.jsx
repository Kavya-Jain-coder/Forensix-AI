import React from 'react';
import { Download, Copy, AlertCircle, CheckCircle } from 'lucide-react';

export default function ReportView({ report }) {
  const Section = ({ title, content }) => (
    <div className="mb-8">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</h3>
      <div className="text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="border-b px-8 py-4 bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <span className="text-sm font-medium">Forensic Analysis Report</span>
           <span className={`px-2 py-1 rounded text-[10px] font-bold ${report.confidence_score > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
             CONFIDENCE: {report.confidence_score}%
           </span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><Copy size={18} /></button>
          <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><Download size={18} /></button>
        </div>
      </div>

      <div className="p-8">
        <Section title="Case Summary" content={report.case_summary} />
        <Section title="Key Observations" content={report.observations} />
        <Section title="Technical Analysis" content={report.analysis} />
        <Section title="Evidence Limitations" content={report.limitations} />
        <Section title="Conclusion" content={report.conclusion} />

        <div className="mt-12 pt-8 border-t">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Evidence Citations (RAG Retrieval)</h3>
          <div className="grid gap-4">
            {report.citations.map((cite, i) => (
              <div key={i} className="text-xs p-3 bg-slate-50 border rounded-lg italic text-slate-600">
                "{cite.content.substring(0, 200)}..."
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}