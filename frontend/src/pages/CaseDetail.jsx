import { useState, useEffect, useRef } from 'react';
import { useAuth, canGenerate, canReview, canUpload } from '../context/AuthContext';
import { ArrowLeft, Upload, FileText, Hash, Eye, Edit3, Send, CheckCircle, XCircle, Download, Clock, AlertCircle, X, Image, ExternalLink } from 'lucide-react';
import ReportView from '../components/ReportView';

const statusConfig = {
  ai_draft: { label: 'AI Draft', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  needs_correction: { label: 'Needs Correction', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  exported: { label: 'Exported', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

export default function CaseDetail({ caseData, onBack }) {
  const { user, authFetch, apiBase, token } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('evidence');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [editingOcr, setEditingOcr] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [caseDetails, setCaseDetails] = useState({ officer_in_charge: '', submitted_by: '', date_of_examination: new Date().toISOString().split('T')[0] });
  const fileInputRef = useRef(null);

  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    loadEvidence();
    loadReports();
  }, [caseData.id]);

  // Load authenticated blob URLs for images
  useEffect(() => {
    evidence.forEach(ev => {
      if (ev.file_type?.startsWith('image/') && !imageUrls[ev.id]) {
        authFetch(`/api/cases/${caseData.id}/evidence/${ev.id}/file`)
          .then(r => r.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setImageUrls(prev => ({ ...prev, [ev.id]: url }));
          })
          .catch(() => {});
      }
    });
  }, [evidence]);

  const loadEvidence = () =>
    authFetch(`/api/cases/${caseData.id}/evidence`).then(r => r.json()).then(setEvidence).catch(console.error);

  const loadReports = () =>
    authFetch(`/api/cases/${caseData.id}/reports`).then(r => r.json()).then(setReports).catch(console.error);

  const handleUpload = async (files) => {
    setUploading(true); setError('');
    const form = new FormData();
    Array.from(files).forEach(f => form.append('files', f));
    try {
      const res = await authFetch(`/api/cases/${caseData.id}/evidence`, { method: 'POST', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      await loadEvidence();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const handleSaveOcr = async () => {
    const form = new FormData();
    form.append('corrected_text', ocrText);
    await authFetch(`/api/cases/${caseData.id}/evidence/${editingOcr.id}/ocr`, { method: 'PATCH', body: form });
    setEditingOcr(null);
    loadEvidence();
  };

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    const form = new FormData();
    if (caseDetails.officer_in_charge) form.append('officer_in_charge', caseDetails.officer_in_charge);
    if (caseDetails.submitted_by) form.append('submitted_by', caseDetails.submitted_by);
    if (caseDetails.date_of_examination) form.append('date_of_examination', caseDetails.date_of_examination);
    try {
      const res = await authFetch(`/api/cases/${caseData.id}/reports`, { method: 'POST', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const report = await res.json();
      await loadReports();
      setSelectedReport(report);
      setActiveTab('reports');
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  };

  const handleSubmitForReview = async (reportId) => {
    await authFetch(`/api/cases/${caseData.id}/reports/${reportId}/submit`, { method: 'PATCH' });
    loadReports();
    if (selectedReport?.id === reportId) setSelectedReport(prev => ({ ...prev, status: 'under_review' }));
  };

  const handleReview = async (reportId) => {
    setReviewing(true);
    const form = new FormData();
    form.append('action', reviewAction);
    if (reviewComments) form.append('comments', reviewComments);
    try {
      const res = await authFetch(`/api/cases/${caseData.id}/reports/${reportId}/review`, { method: 'PATCH', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      await loadReports();
      setReviewAction(''); setReviewComments('');
      const updated = await authFetch(`/api/cases/${caseData.id}/reports/${reportId}`).then(r => r.json());
      setSelectedReport(updated);
    } catch (err) { setError(err.message); }
    finally { setReviewing(false); }
  };

  const handleExportPdf = async (reportId) => {
    const res = await authFetch(`/api/cases/${caseData.id}/reports/${reportId}/export/pdf`);
    if (!res.ok) { const e = await res.json(); setError(e.detail); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report-${reportId}.pdf`; a.click();
    loadReports();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-400">{caseData.case_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusConfig[caseData.status]?.color || ''}`}>
              {statusConfig[caseData.status]?.label || caseData.status}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">{caseData.title}</h2>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle size={16} className="text-red-400" />
          <p className="text-red-300 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700 w-fit">
        {['evidence', 'generate', 'reports'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab === 'reports' ? `Reports (${reports.length})` : tab === 'evidence' ? `Evidence (${evidence.length})` : tab}
          </button>
        ))}
      </div>

      {/* Evidence Tab */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {canUpload(user) && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
            >
              <Upload size={32} className="mx-auto mb-2 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                {uploading ? 'Uploading...' : 'Click to upload evidence files'}
              </p>
              <p className="text-xs text-slate-600 mt-1">PDF, TXT, JPG, PNG, TIFF — max 50MB each</p>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
                onChange={e => e.target.files?.length && handleUpload(e.target.files)} />
            </div>
          )}

          {evidence.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No evidence uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {evidence.map(ev => {
                const isImage = ev.file_type?.startsWith('image/');
                const fileUrl = `${apiBase}/api/cases/${caseData.id}/evidence/${ev.id}/file`;
                return (
                  <div key={ev.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    {/* Image preview */}
                    {isImage && imageUrls[ev.id] && (
                      <div className="bg-slate-900/50 border-b border-slate-700 flex items-center justify-center" style={{maxHeight: '280px', overflow: 'hidden'}}>
                        <img
                          src={imageUrls[ev.id]}
                          alt={ev.original_filename}
                          style={{maxHeight: '280px', maxWidth: '100%', objectFit: 'contain'}}
                          className="w-full"
                        />
                      </div>
                    )}
                    {isImage && !imageUrls[ev.id] && (
                      <div className="bg-slate-900/50 border-b border-slate-700 flex items-center justify-center h-24">
                        <p className="text-xs text-slate-500">Loading image...</p>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-cyan-400 text-sm font-bold">{ev.exhibit_ref}</span>
                            {ev.ocr_corrected && <span className="text-xs px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded">OCR Corrected</span>}
                            {isImage && <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Image</span>}
                          </div>
                          <p className="text-sm text-slate-300 truncate">{ev.original_filename}</p>
                          <p className="text-xs text-slate-500 mt-1">{ev.file_type} · {(ev.file_size / 1024).toFixed(1)} KB · {new Date(ev.uploaded_at).toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <Hash size={12} className="text-slate-500" />
                            <span className="text-xs font-mono text-slate-500 truncate">{ev.sha256_hash}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {/* View/download file */}
                          <a
                            href={imageUrls[ev.id] || '#'}
                            target="_blank"
                            rel="noreferrer"
                            onClick={async (e) => {
                              if (!isImage) {
                                e.preventDefault();
                                const res = await authFetch(`/api/cases/${caseData.id}/evidence/${ev.id}/file`);
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = ev.original_filename; a.click();
                              }
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            title={isImage ? 'View full image' : 'Download file'}
                          >
                            <ExternalLink size={15} />
                          </a>
                          {ev.extracted_text && (
                            <button onClick={() => setSelectedEvidence(ev)}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Preview OCR text">
                              <Eye size={15} />
                            </button>
                          )}
                          {canUpload(user) && (
                            <button onClick={() => { setEditingOcr(ev); setOcrText(ev.extracted_text || ''); }}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Edit OCR text">
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="max-w-lg space-y-4">
          {!canGenerate(user) ? (
            <p className="text-slate-400 text-sm">You do not have permission to generate reports.</p>
          ) : (
            <>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Case Details for Report</h3>
                {[
                  { key: 'officer_in_charge', label: 'Officer in Charge', placeholder: 'e.g. Det. Sarah Collins, Badge #4821' },
                  { key: 'submitted_by', label: 'Submitted By', placeholder: 'e.g. Metropolitan Police, CID Unit' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1">{label}</label>
                    <input type="text" placeholder={placeholder} value={caseDetails[key]}
                      onChange={e => setCaseDetails(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date of Examination</label>
                  <input type="date" value={caseDetails.date_of_examination}
                    onChange={e => setCaseDetails(p => ({ ...p, date_of_examination: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-lg border border-slate-700 p-4">
                <p className="text-xs text-slate-400">{evidence.length} evidence file(s) will be analysed. Report will be saved as <span className="text-cyan-400 font-medium">AI Draft</span> and must be submitted for review before export.</p>
              </div>

              <button onClick={handleGenerate} disabled={generating || evidence.length === 0}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {generating ? 'Generating Report...' : <><FileText size={16} /> Generate Forensic Report</>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No reports generated yet.</p>
            ) : reports.map(r => {
              const st = statusConfig[r.status] || statusConfig.ai_draft;
              return (
                <div key={r.id} onClick={() => setSelectedReport(r)}
                  className={`bg-slate-800/50 rounded-xl border p-4 cursor-pointer transition-all hover:bg-slate-800/80 ${selectedReport?.id === r.id ? 'border-cyan-500' : 'border-slate-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">{r.report_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(r.generated_at).toLocaleString()}</p>
                  {r.reviewer_comments && <p className="text-xs text-slate-400 mt-2 italic line-clamp-2">"{r.reviewer_comments}"</p>}
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="space-y-4">
                {/* Report Actions */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-wrap gap-3 items-center">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusConfig[selectedReport.status]?.color}`}>
                    {statusConfig[selectedReport.status]?.label}
                  </span>

                  {canGenerate(user) && ['ai_draft', 'needs_correction'].includes(selectedReport.status) && (
                    <button onClick={() => handleSubmitForReview(selectedReport.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors">
                      <Send size={13} /> Submit for Review
                    </button>
                  )}

                  {canReview(user) && selectedReport.status === 'under_review' && (
                    <div className="flex items-center gap-2">
                      <textarea rows={1} placeholder="Reviewer comments (optional)"
                        value={reviewComments} onChange={e => setReviewComments(e.target.value)}
                        className="px-2 py-1 bg-slate-900/60 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48 resize-none" />
                      <button onClick={() => { setReviewAction('approve'); handleReview(selectedReport.id); }}
                        disabled={reviewing}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button onClick={() => { setReviewAction('reject'); handleReview(selectedReport.id); }}
                        disabled={reviewing}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}

                  {selectedReport.status === 'approved' && (
                    <button onClick={() => handleExportPdf(selectedReport.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors">
                      <Download size={13} /> Export PDF
                    </button>
                  )}
                </div>

                {selectedReport.reviewer_comments && (
                  <div className="bg-slate-800/30 rounded-lg border border-slate-600 p-3">
                    <p className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Reviewer comment:</span> {selectedReport.reviewer_comments}</p>
                  </div>
                )}

                <ReportView report={{ ...selectedReport.report_data, confidence_score: selectedReport.confidence_score }} />
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500">
                Select a report to view
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR Preview Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">OCR Text — {selectedEvidence.exhibit_ref}</h3>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {selectedEvidence.extracted_text || 'No text extracted.'}
            </div>
          </div>
        </div>
      )}

      {/* OCR Edit Modal */}
      {editingOcr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Edit OCR Text — {editingOcr.exhibit_ref}</h3>
              <button onClick={() => setEditingOcr(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <textarea
              className="flex-1 bg-slate-900/50 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500 min-h-64"
              value={ocrText} onChange={e => setOcrText(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingOcr(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleSaveOcr} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">Save Corrections</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
