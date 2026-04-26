import { useState } from 'react';
import FileUploader from './FileUploader';
import ReportView from './ReportView';
import LoadingState from './LoadingState';

export default function Dashboard() {
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
      if (!response.ok) throw new Error('Failed to process file');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Upload Evidence</h2>
          <FileUploader onUpload={handleUpload} disabled={loading} />
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      </div>
      
      <div className="lg:col-span-8">
        {loading ? <LoadingState /> : report ? <ReportView report={report} /> : (
          <div className="h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400">
            <p>No report generated yet. Upload a file to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}