import { useState } from 'react';
import { Home, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import FileUploader from './FileUploader';
import ReportView from './ReportView';
import LoadingState from './LoadingState';
import ErrorBoundary from './ErrorBoundary';

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  }
  return null;
};

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// step: 'upload' | 'details' | 'generating' | 'done'
export default function Dashboard({ onNavigateToHome }) {
  const [step, setStep] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caseDetails, setCaseDetails] = useState({
    officer_in_charge: '',
    submitted_by: '',
    date_of_examination: today(),
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingStage, setProcessingStage] = useState(null);

  const handleFilesSelected = (files) => {
    setSelectedFiles(files);
    setStep('details');
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setProcessingStage('uploading');
    setStep('generating');

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));
    formData.append('officer_in_charge', caseDetails.officer_in_charge.trim() || 'Senior Forensic Examiner');
    formData.append('submitted_by', caseDetails.submitted_by.trim() || 'Forensic Submissions Unit');
    formData.append('date_of_examination', caseDetails.date_of_examination || today());

    try {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error('API URL not configured.');

      setProcessingStage('extracting');
      const response = await fetch(`${apiBaseUrl}/api/generate-report`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = 'Failed to process file';
        try {
          const err = await response.json();
          message = err.detail || message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }

      setProcessingStage('formatting');
      const data = await response.json();
      setReport(data);
      setStep('done');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setStep('details');
    } finally {
      setLoading(false);
      setProcessingStage(null);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFiles([]);
    setReport(null);
    setError(null);
    setCaseDetails({ officer_in_charge: '', submitted_by: '', date_of_examination: today() });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Forensic Analysis Dashboard</h2>
            <button
              onClick={onNavigateToHome}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all text-slate-200"
            >
              <Home size={18} />
              Go to Home
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {['upload', 'details', 'done'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  step === s || (step === 'generating' && s === 'details') || (step === 'done' && i < 2)
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${step === s ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {s === 'upload' ? 'Upload Evidence' : s === 'details' ? 'Case Details' : 'Report'}
                </span>
                {i < 2 && <ArrowRight size={14} className="text-slate-600" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur">

                {/* Step 1: Upload */}
                {step === 'upload' && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-white">Upload Evidence</h3>
                    <FileUploader onUpload={handleFilesSelected} disabled={false} />
                  </>
                )}

                {/* Step 2: Case Details */}
                {(step === 'details' || step === 'generating') && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Case Details</h3>
                      {step === 'details' && (
                        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                          <ArrowLeft size={13} /> Back
                        </button>
                      )}
                    </div>

                    {/* Files summary */}
                    <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">{selectedFiles.length} file(s) ready</p>
                      {selectedFiles.map((f, i) => (
                        <p key={i} className="text-xs text-slate-300 truncate">• {f.name}</p>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Officer in Charge</label>
                        <input
                          type="text"
                          placeholder="e.g. Det. Sarah Collins, Badge #4821"
                          value={caseDetails.officer_in_charge}
                          onChange={e => setCaseDetails(p => ({ ...p, officer_in_charge: e.target.value }))}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Submitted By</label>
                        <input
                          type="text"
                          placeholder="e.g. Metropolitan Police, CID Unit"
                          value={caseDetails.submitted_by}
                          onChange={e => setCaseDetails(p => ({ ...p, submitted_by: e.target.value }))}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Date of Examination</label>
                        <input
                          type="date"
                          value={caseDetails.date_of_examination}
                          onChange={e => setCaseDetails(p => ({ ...p, date_of_examination: e.target.value }))}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                        />
                      </div>

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
                          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-300 text-xs">{error}</p>
                        </div>
                      )}

                      <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Generating...' : <>Generate Report <ArrowRight size={15} /></>}
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: Done — show new analysis button */}
                {step === 'done' && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-white">Report Ready</h3>
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                      <p className="text-green-400 text-sm font-medium">✓ Analysis complete</p>
                      <p className="text-green-300 text-xs mt-1">{selectedFiles.length} file(s) analysed</p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      New Analysis
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              {step === 'generating' ? (
                <LoadingState stage={processingStage} fileName={selectedFiles.map(f => f.name).join(', ')} />
              ) : step === 'done' && report ? (
                <ReportView report={report} />
              ) : (
                <div className="h-96 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 transition-colors bg-slate-800/20">
                  <p className="text-lg">
                    {step === 'details' ? 'Fill in case details to generate report' : 'No report generated yet'}
                  </p>
                  <p className="text-sm mt-2">
                    {step === 'details' ? 'Fields are optional — leave blank to auto-fill' : 'Upload evidence files to begin analysis'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
