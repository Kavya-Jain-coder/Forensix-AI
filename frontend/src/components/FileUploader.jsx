import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';

export default function FileUploader({ onUpload, disabled }) {
  const inputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setSelectedFiles(files);
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (selectedFiles.length) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const getFileIcon = (file) =>
    file.type.startsWith('image/') ? <Image size={14} className="text-cyan-400" /> : <FileText size={14} className="text-blue-400" />;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
        accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
      >
        <Upload size={20} />
        {disabled ? 'Processing...' : 'Select Evidence Files'}
      </button>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{selectedFiles.length} file(s) selected:</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-slate-300">
                <div className="flex items-center gap-2 truncate">
                  {getFileIcon(file)}
                  <span className="truncate">{file.name}</span>
                </div>
                <button onClick={() => removeFile(idx)} className="ml-2 text-slate-500 hover:text-red-400 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Analyse {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
