import { useState } from 'react';
import { Home, AlertCircle } from 'lucide-react';
import FileUploader from './FileUploader';
import ReportView from './ReportView';
import LoadingState from './LoadingState';
import DocumentPreview from './DocumentPreview';
import ErrorBoundary from './ErrorBoundary';

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  }

  return null;
};

export default function Dashboard({ onNavigateToHome }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingStage, setProcessingStage] = useState(null);

  const handleUpload = async (file) => {
    setSelectedFile(file);
    setLoading(true);
    setError(null);
    setProcessingStage('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) {
        throw new Error('API URL not configured. Ensure backend is running on http://localhost:8001');
      }

      setProcessingStage('extracting');
      const response = await fetch(`${apiBaseUrl}/api/generate-report`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let message = 'Failed to process file';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }
      
      setProcessingStage('formatting');
      const data = await response.json();
      setReport(data);
      setProcessingStage('complete');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setProcessingStage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleUpload(selectedFile);
    }
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Upload Section */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur">
                <h3 className="text-lg font-semibold mb-4 text-white">Upload Evidence</h3>
                <FileUploader onUpload={handleUpload} disabled={loading} />
                
                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-400 text-sm font-medium">Error</p>
                        <p className="text-red-300 text-sm mt-1">{error}</p>
                        {error.includes('rate limit') && (
                          <p className="text-red-200 text-xs mt-2 italic">The system will automatically retry up to 3 times with increasing delays. You can also click "Retry Upload" to start immediately.</p>
                        )}
                        {selectedFile && (
                          <button
                            onClick={handleRetry}
                            className="mt-2 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs rounded transition-colors"
                          >
                            Retry Upload
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* File Preview */}
              {selectedFile && !loading && !report && (
                <DocumentPreview file={selectedFile} />
              )}
            </div>
            
            {/* Report/Loading Section */}
            <div className="lg:col-span-8">
              {loading ? (
                <LoadingState stage={processingStage} fileName={selectedFile?.name} />
              ) : report ? (
                <ReportView report={report} />
              ) : (
                <div className="h-96 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 transition-colors bg-slate-800/20">
                  <p className="text-lg">No report generated yet</p>
                  <p className="text-sm mt-2">Upload evidence file to begin analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
