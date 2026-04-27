import React from 'react';
import { FileText, Zap, Sparkles, CheckCircle } from 'lucide-react';

const STAGES = {
  uploading: { icon: FileText, label: 'Uploading file', color: 'text-blue-400' },
  extracting: { icon: FileText, label: 'Extracting text', color: 'text-cyan-400' },
  chunking: { icon: Zap, label: 'Processing chunks', color: 'text-purple-400' },
  embedding: { icon: Sparkles, label: 'Creating embeddings', color: 'text-yellow-400' },
  retrieving: { icon: Zap, label: 'Retrieving context', color: 'text-pink-400' },
  generating: { icon: Sparkles, label: 'Generating report', color: 'text-green-400' },
  formatting: { icon: CheckCircle, label: 'Formatting results', color: 'text-emerald-400' },
  complete: { icon: CheckCircle, label: 'Complete', color: 'text-green-400' },
};

export default function LoadingState({ stage = 'extracting', fileName = 'Evidence' }) {
  const stageOrder = ['uploading', 'extracting', 'chunking', 'embedding', 'retrieving', 'generating', 'formatting', 'complete'];
  const currentIndex = stageOrder.indexOf(stage || 'extracting');
  const progress = Math.max(20, (currentIndex + 1) / stageOrder.length * 100);

  return (
    <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 backdrop-blur min-h-96 flex flex-col">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-2">Analyzing Evidence</h3>
      <p className="text-sm text-slate-400 mb-6">{fileName}</p>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400">Processing Progress</span>
          <span className="text-xs font-mono text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="space-y-3 flex-1">
        {stageOrder.map((stageKey, idx) => {
          const stageInfo = STAGES[stageKey];
          const Icon = stageInfo.icon;
          const isActive = idx === currentIndex;
          const isComplete = idx < currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <div key={stageKey} className="flex items-center gap-3">
              {/* Status Indicator */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-blue-500/30 ring-2 ring-blue-400 animate-pulse' :
                isComplete ? 'bg-green-500/20 ring-1 ring-green-400' :
                'bg-slate-700 ring-1 ring-slate-600'
              }`}>
                {isComplete ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Icon size={16} className={isActive ? 'text-blue-400 animate-spin' : 'text-slate-500'} />
                )}
              </div>

              {/* Stage Label */}
              <div className="flex-1">
                <p className={`text-sm font-medium transition-colors ${
                  isActive ? 'text-white' :
                  isComplete ? 'text-green-400' :
                  'text-slate-500'
                }`}>
                  {stageInfo.label}
                </p>
              </div>

              {/* Status Badge */}
              {isComplete && (
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">Done</span>
              )}
              {isActive && (
                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded animate-pulse">Running</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Stage Message */}
      <div className="mt-8 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
        <p className="text-xs text-slate-400">
          {stage === 'uploading' && '📤 Transferring file to server for processing...'}
          {stage === 'extracting' && '📄 Extracting text content from uploaded document...'}
          {stage === 'chunking' && '✂️ Dividing document into semantic chunks for analysis...'}
          {stage === 'embedding' && '🔢 Converting text to embeddings for similarity search...'}
          {stage === 'retrieving' && '🔍 Retrieving most relevant evidence segments...'}
          {stage === 'generating' && '🤖 Generating forensic report using AI analysis...'}
          {stage === 'formatting' && '✨ Formatting and finalizing the report...'}
          {stage === 'complete' && '✅ Analysis complete! Report is ready.'}
          {!stage && '⏳ Initializing analysis pipeline...'}
        </p>
      </div>
    </div>
  );
}
