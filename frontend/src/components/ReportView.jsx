import React, { useState } from 'react';
import { Download, Copy, AlertCircle, CheckCircle, TrendingUp, Shield } from 'lucide-react';

export default function ReportView({ report }) {
  const [copied, setCopied] = useState(false);

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase?.()) {
      case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'CRITICAL' };
      case 'high': return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'HIGH' };
      case 'medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'MEDIUM' };
      case 'low': return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'LOW' };
      default: return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: 'NONE' };
    }
  };

  const handleCopy = () => {
    const text = generatePlainText(report);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = generatePlainText(report);
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `forensic-report-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generatePlainText = (report) => {
    return `FORENSIC ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Confidence: ${report.confidence_score}%

CASE SUMMARY
${report.case_summary}

KEY FINDINGS
${report.key_findings?.map(f => `• ${f.title} (${f.severity})\n  ${f.description}`).join('\n')}

EVIDENCE EXTRACTED
${report.evidence_extracted?.join('\n• ') || 'N/A'}

RISK LEVEL: ${report.risk_level}

RECOMMENDATIONS
${report.recommendations?.map(r => `• ${r}`).join('\n')}

TECHNICAL NOTES
${report.technical_notes || 'N/A'}
    `;
  };

  const riskInfo = getRiskColor(report.risk_level);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Report Header */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-8 py-6 border-b border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Forensic Analysis Report</h2>
              <p className="text-sm text-slate-400">Generated on {new Date().toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white text-sm"
              >
                <Copy size={16} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors text-blue-400 hover:text-blue-300 text-sm"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Confidence & Risk Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${report.confidence_score > 70 ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <p className="text-xs text-slate-400 mb-1">Analysis Confidence</p>
              <p className={`text-2xl font-bold ${report.confidence_score > 70 ? 'text-green-400' : 'text-amber-400'}`}>
                {report.confidence_score?.toFixed(0) || 75}%
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${riskInfo.bg} ${riskInfo.border}`}>
              <p className="text-xs text-slate-400 mb-1">Risk Level</p>
              <p className={`text-2xl font-bold ${riskInfo.text}`}>
                {riskInfo.label}
              </p>
            </div>
          </div>
        </div>

        {/* Case Summary */}
        <div className="px-8 py-6 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-400" />
            Case Summary
          </h3>
          <p className="text-slate-300 leading-relaxed">{report.case_summary}</p>
        </div>
      </div>

      {/* Key Findings */}
      {report.key_findings && report.key_findings.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-8">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-yellow-400" />
            Key Findings
          </h3>
          <div className="space-y-3">
            {report.key_findings.map((finding, idx) => (
              <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-white">{finding.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {finding.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{finding.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Extracted */}
      {report.evidence_extracted && report.evidence_extracted.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-8">
          <h3 className="text-sm font-semibold text-white mb-4">Evidence Extracted ({report.evidence_extracted.length})</h3>
          <div className="grid grid-cols-1 gap-2">
            {report.evidence_extracted.map((evidence, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/30 rounded-lg text-sm text-slate-300">
                <span className="text-blue-400 font-medium flex-shrink-0">→</span>
                <span>{evidence}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-8">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={18} className="text-green-400" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="text-green-400 font-bold flex-shrink-0">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Citations */}
      {report.citations && report.citations.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur p-8">
          <h3 className="text-sm font-semibold text-white mb-4">Source Citations ({report.citations.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {report.citations.map((cite, i) => (
              <div key={i} className="p-3 bg-slate-900/50 border border-slate-700 rounded text-xs text-slate-400 hover:text-slate-300 transition-colors">
                <span className="text-slate-500 font-mono">[{i + 1}]</span> {cite.content?.substring?.(0, 150) || 'Source'}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
