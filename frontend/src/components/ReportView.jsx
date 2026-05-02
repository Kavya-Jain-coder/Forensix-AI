import React, { useState } from 'react';
import { Download, Copy, Shield, FileText, AlertCircle, CheckCircle, BookOpen, BarChart2 } from 'lucide-react';

const severityStyle = (s) => {
  switch (s?.toLowerCase()) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

const riskStyle = (r) => {
  switch (r?.toLowerCase()) {
    case 'critical': return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'high': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    default: return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  }
};

export default function ReportView({ report }) {
  const [copied, setCopied] = useState(false);

  const generatePlainText = () => {
    const lines = [
      report.classification || 'FORENSIC SCIENCE LABORATORY REPORT',
      `Report Number: ${report.report_number || 'N/A'}`,
      `Date of Examination: ${report.date_of_examination || new Date().toLocaleDateString()}`,
      `Officer in Charge: ${report.officer_in_charge || 'N/A'}`,
      `Submitted By: ${report.submitted_by || 'N/A'}`,
      '',
      '── BACKGROUND ──',
      report.background || '',
      '',
      '── EXHIBITS ──',
      ...(report.exhibits || []).map(e => `${e.exhibit_ref}: ${e.description} [${e.condition}]`),
      '',
      '── EXAMINATION ──',
      report.examination_narrative || '',
      '',
      '── KEY FINDINGS ──',
      ...(report.key_findings || []).map(f => `[${f.finding_number}] ${f.exhibit_ref} — ${f.finding} (${f.significance})`),
      '',
      '── STATISTICAL ANALYSIS ──',
      report.statistical_analysis || 'N/A',
      '',
      '── CONCLUSION ──',
      report.conclusion || '',
      '',
      '── RECOMMENDATIONS ──',
      ...(report.recommendations || []).map((r, i) => `${i + 1}. ${r}`),
      '',
      '── EXAMINER STATEMENT ──',
      report.examiner_statement || '',
      '',
      `Confidence Score: ${report.confidence_score?.toFixed(0) || 'N/A'}%`,
      report.confidence_note || '',
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatePlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([generatePlainText()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${report.report_number || 'forensic-report'}.txt`;
    a.click();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-8 py-6 border-b border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-cyan-400 font-mono tracking-widest mb-1">{report.classification}</p>
              <h2 className="text-2xl font-bold text-white">Forensic Laboratory Report</h2>
              <p className="text-sm text-slate-400 mt-1 font-mono">{report.report_number}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-sm transition-colors">
                <Copy size={15} />{copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 text-sm transition-colors">
                <Download size={15} />Export
              </button>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Date of Examination', value: report.date_of_examination },
              { label: 'Officer in Charge', value: report.officer_in_charge },
              { label: 'Submitted By', value: report.submitted_by },
              { label: 'Confidence', value: `${report.confidence_score?.toFixed(0) || '—'}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-900/40 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 mb-1">{label}</p>
                <p className="text-slate-200 font-medium">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk level */}
        <div className="px-8 py-3 flex items-center gap-3 border-b border-slate-700">
          <span className="text-xs text-slate-500">Risk Assessment:</span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${riskStyle(report.risk_level)}`}>
            {report.risk_level?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>

        {/* Background */}
        <div className="px-8 py-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Background
          </h3>
          <p className="text-slate-300 leading-relaxed text-sm">{report.background}</p>
        </div>
      </div>

      {/* Exhibits */}
      {report.exhibits?.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={14} /> Exhibits Examined
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 pr-4">Exhibit Ref</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {report.exhibits.map((ex, i) => (
                  <tr key={i} className="text-slate-300">
                    <td className="py-2 pr-4 font-mono text-cyan-400 font-medium">{ex.exhibit_ref}</td>
                    <td className="py-2 pr-4">{ex.description}</td>
                    <td className="py-2 text-slate-400">{ex.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Examination Narrative */}
      {report.examination_narrative && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle size={14} /> Examination
          </h3>
          <div className="space-y-3">
            {report.examination_narrative.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className="text-slate-300 leading-relaxed text-sm">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {report.key_findings?.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle size={14} /> Key Findings
          </h3>
          <div className="space-y-3">
            {report.key_findings.map((f, i) => (
              <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">[{f.finding_number || i + 1}]</span>
                    <span className="text-xs font-mono text-cyan-400">{f.exhibit_ref}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${severityStyle(f.significance)}`}>
                    {f.significance?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{f.finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistical Analysis */}
      {report.statistical_analysis && report.statistical_analysis !== 'Not applicable to this examination.' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart2 size={14} /> Statistical Analysis
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-cyan-500/50 pl-4">
            {report.statistical_analysis}
          </p>
        </div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Shield size={14} /> Conclusion
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">{report.conclusion}</p>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Recommendations</h3>
          <ol className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300">
                <span className="text-cyan-400 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Examiner Statement */}
      {report.examiner_statement && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-600 p-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Examiner Statement</p>
          <p className="text-slate-400 text-sm italic leading-relaxed">{report.examiner_statement}</p>
          {report.confidence_note && (
            <p className="text-slate-500 text-xs mt-3 border-t border-slate-700 pt-3">{report.confidence_note}</p>
          )}
        </div>
      )}
    </div>
  );
}
