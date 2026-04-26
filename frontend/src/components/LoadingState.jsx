import React from 'react';

export default function LoadingState() {
  return (
    <div className="h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-slate-50 rounded-full"></div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-700">Analyzing Evidence...</p>
          <p className="text-sm text-slate-500 mt-1">This may take a moment</p>
        </div>
      </div>
    </div>
  );
}
