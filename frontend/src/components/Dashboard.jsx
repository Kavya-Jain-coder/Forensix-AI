import { useState } from 'react';
import { Home } from 'lucide-react';
import FileUploader from './FileUploader';
import ReportView from './ReportView';
import LoadingState from './LoadingState';

export default function Dashboard({ onNavigateToHome }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-report`, {
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
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Forensic Analysis Dashboard</h2>
        <button
          onClick={onNavigateToHome}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all text-slate-200"
        >
          <Home size={18} />
          Go to Home
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur">
            <h2 className="text-lg font-semibold mb-4 text-white">Upload Evidence</h2>
            <FileUploader onUpload={handleUpload} disabled={loading} />
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        </div>
        
        <div className="lg:col-span-8">
          {loading ? <LoadingState /> : report ? <ReportView report={report} /> : (
            <div className="h-96 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 transition-colors">
              <p>No report generated yet. Upload a file to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
