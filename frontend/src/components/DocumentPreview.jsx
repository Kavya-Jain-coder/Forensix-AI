import React, { useState } from 'react';
import { FileText, FileImage, File, AlertCircle } from 'lucide-react';

export default function DocumentPreview({ file }) {
  if (!file) return null;

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <FileImage size={20} />;
    if (type.includes('pdf')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileType = (name) => {
    const ext = name.split('.').pop().toUpperCase();
    return ext;
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
        Document Preview
      </h3>

      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        {/* File Icon & Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
            {getFileIcon(file.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-slate-400 mt-1">{getFileType(file.name)}</p>
          </div>
        </div>

        {/* File Info Grid */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-slate-700">
          <div>
            <p className="text-xs text-slate-500 mb-1">File Size</p>
            <p className="text-sm font-mono text-slate-300">{formatFileSize(file.size)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">File Type</p>
            <p className="text-sm font-mono text-slate-300">{file.type || 'Unknown'}</p>
          </div>
        </div>

        {/* Info Message */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded flex gap-2 items-start">
          <AlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            This file will be analyzed using OCR and semantic analysis to extract evidence and generate a forensic report.
          </p>
        </div>
      </div>
    </div>
  );
}
