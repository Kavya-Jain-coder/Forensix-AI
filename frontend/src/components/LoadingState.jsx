import React from 'react';

export default function LoadingState() {
  return (
    <div className="h-96 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center bg-slate-800/30 backdrop-blur">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-slate-900 rounded-full"></div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">Analyzing Evidence...</p>
          <p className="text-sm text-slate-400 mt-1">This may take a moment</p>
        </div>
      </div>
    </div>
  );
}
