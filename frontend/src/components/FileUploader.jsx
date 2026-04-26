import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export default function FileUploader({ onUpload, disabled }) {
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <Upload size={20} />
        {disabled ? 'Processing...' : 'Upload Evidence'}
      </button>
    </div>
  );
}
