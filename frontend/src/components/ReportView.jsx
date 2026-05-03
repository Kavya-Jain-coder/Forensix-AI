import React, { useState } from 'react';
import { Download, Copy, Shield, FileText, AlertCircle, CheckCircle, BookOpen, BarChart2, Microscope, Scale } from 'lucide-react';

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
      `Laboratory Reference: ${report.laboratory_reference || 'N/A'}`,
      `Date of Examination: ${report.date_of_examination || 'N/A'}`,
      `Date of Report: ${report.date_of_report || 'N/A'}`,
      `Officer in Charge: ${report.officer_in_charge || 'N/A'}`,
      `Submitted By: ${report.submitted_by || 'N/A'}`,
      '',
      '── BACKGROUND ──',
      report.background || '',
      '',
      '── SCOPE OF EXAMINATION ──',
      report.scope_of_examination || '',
      '',
      '── EXHIBITS ──',
      ...(report.exhibits || []).map(e =>
        `${e.exhibit_ref}: ${e.description}\n  Condition: ${e.condition_on_receipt}\n  Examination Type: ${e.examination_type}`
      ),
      '',
      '── EXAMINATION ──',
      report.examination_narrative || '',
      '',
      '── KEY FINDINGS ──',
      ...(report.key_findings || []).map(f =>
        `[${f.finding_number}] ${f.exhibit_ref} (${f.significance?.toUpperCase()})\n  ${f.finding}\n  Evidential Value: ${f.evidential_value || 'N/A'}`
      ),
      '',
      '── STATISTICAL ANALYSIS ──',
      report.statistical_analysis || 'N/A',
      '',
      '── CONCLUSION ──',
      report.conclusion || '',
      '',
      '── LIMITATIONS ──',
      report.limitations || 'None identified.',
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

  const Section = ({ icon, title, children }) => (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-6">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        {icon}{title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-8 py-6 border-b border-slate-700">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-xs text-cyan-400 font-mono tracking-widest mb-1">{report.classification}</p>
              <h2 className="text-2xl font-bold text-white">Forensic Laboratory Report</h2>
              <div className="flex gap-4 mt-2">
                <p className="text-sm text-slate-400 font-mono">{report.report_number}</p>
                {report.laboratory_reference && (
                  <p className="text-sm text-slate-500 font-mono">Ref: {report.laboratory_reference}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-sm transition-colors">
                <Copy size={15} />{copied ? 'Copied!' : 'Copy Text'}
              </button>
              {report.status === 'approved' || report.status === 'exported' ? (
                report.onExportPdf ? (
                  <button onClick={report.onExportPdf} className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-green-400 text-sm transition-colors font-medium">
                    <Download size={15} />Export PDF
                  </button>
                ) : null
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/20 rounded-lg text-slate-500 text-xs">
                  <Download size={14} />PDF available after approval
                </div>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Date of Examination', value: report.date_of_examination },
              { label: 'Date of Report', value: report.date_of_report },
              { label: 'Officer in Charge', value: report.officer_in_charge },
              { label: 'Submitted By', value: report.submitted_by },
              { label: 'Risk Assessment', value: <span className={`font-bold ${riskStyle(report.risk_level).split(' ')[0]}`}>{report.risk_level?.toUpperCase()}</span> },
              { label: 'Analysis Confidence', value: `${report.confidence_score?.toFixed(0) || '—'}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-900/40 rounded-lg p-3 border border-slate-700">
                <p className="text-slate-500 mb-1">{label}</p>
                <p className="text-slate-200 font-medium">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="px-8 py-6 border-b border-slate-700">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Background
          </h3>
          <p className="text-slate-300 leading-relaxed text-sm">{report.background}</p>
        </div>

        {/* Scope */}
        {report.scope_of_examination && (
          <div className="px-8 py-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Scale size={14} /> Scope of Examination
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm">{report.scope_of_examination}</p>
          </div>
        )}
      </div>

      {/* Exhibits */}
      {report.exhibits?.length > 0 && (
        <Section icon={<FileText size={14} />} title={`Exhibits Examined (${report.exhibits.length})`}>
          <div className="space-y-3">
            {report.exhibits.map((ex, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-cyan-400 font-bold text-sm">{ex.exhibit_ref}</span>
                  {ex.examination_type && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">{ex.examination_type}</span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mb-1">{ex.description}</p>
                {ex.condition_on_receipt && (
                  <p className="text-xs text-slate-500">Condition on receipt: {ex.condition_on_receipt}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Examination Narrative */}
      {report.examination_narrative && (
        <Section icon={<Microscope size={14} />} title="Examination">
          <div className="space-y-4">
            {report.examination_narrative.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className="text-slate-300 leading-relaxed text-sm">{para}</p>
            ))}
          </div>
        </Section>
      )}

      {/* Key Findings */}
      {report.key_findings?.length > 0 && (
        <Section icon={<CheckCircle size={14} />} title={`Key Findings (${report.key_findings.length})`}>
          <div className="space-y-4">
            {report.key_findings.map((f, i) => (
              <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">#{f.finding_number || i + 1}</span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{f.exhibit_ref}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${severityStyle(f.significance)}`}>
                    {f.significance?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-2">{f.finding}</p>
                {f.evidential_value && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Evidential Value:</span> {f.evidential_value}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Statistical Analysis */}
      {report.statistical_analysis && report.statistical_analysis !== 'Not applicable to this examination.' && (
        <Section icon={<BarChart2 size={14} />} title="Statistical Analysis">
          <div className="border-l-2 border-cyan-500/50 pl-4">
            {report.statistical_analysis.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className="text-slate-300 text-sm leading-relaxed italic mb-2">{para}</p>
            ))}
          </div>
        </Section>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <Section icon={<Shield size={14} />} title="Conclusion">
          <div className="space-y-2">
            {report.conclusion.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
            ))}
          </div>
        </Section>
      )}

      {/* Limitations */}
      {report.limitations && report.limitations !== 'None identified.' && (
        <Section icon={<AlertCircle size={14} />} title="Limitations">
          <p className="text-slate-400 text-sm leading-relaxed">{report.limitations}</p>
        </Section>
      )}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <Section icon={<CheckCircle size={14} />} title="Recommendations">
          <ol className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300">
                <span className="text-cyan-400 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Examiner Statement */}
      {report.examiner_statement && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-600 p-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Examiner Statement</p>
          <p className="text-slate-300 text-sm italic leading-relaxed">{report.examiner_statement}</p>
          {report.confidence_note && (
            <p className="text-slate-500 text-xs mt-4 pt-3 border-t border-slate-700">{report.confidence_note}</p>
          )}
        </div>
      )}
    </div>
  );
}
