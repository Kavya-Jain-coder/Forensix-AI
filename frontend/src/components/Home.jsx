import React from 'react';
import { FileText, Zap, Lock, BarChart3, ArrowRight, CheckCircle, Shield, Users, FileSearch } from 'lucide-react';
import forensixLogo from '../assets/forensix-logo.png';

export default function Home({ onNavigateToDashboard }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
          <img src={forensixLogo} alt="Forensix AI" className="h-10 sm:h-14 w-auto object-contain" />
          <button
            onClick={onNavigateToDashboard}
            className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm sm:text-base transition-all"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  AI-Powered{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Forensic Analysis
                  </span>
                </h1>
                <p className="text-base sm:text-xl text-slate-300 leading-relaxed">
                  Transform evidence into insights. ForensixAI uses advanced AI to generate comprehensive forensic reports in seconds.
                </p>
              </div>

              <button
                onClick={onNavigateToDashboard}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold text-base sm:text-lg transition-all"
              >
                Start Analyzing <ArrowRight size={20} />
              </button>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: 'PDF', sub: 'Text Evidence', color: 'text-blue-400' },
                  { label: 'IMG', sub: 'Visual Evidence', color: 'text-cyan-400' },
                  { label: 'RAG', sub: 'Cited Context', color: 'text-purple-400' },
                ].map(({ label, sub, color }) => (
                  <div key={label} className="p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
                    <div className={`text-xl sm:text-2xl font-bold ${color}`}>{label}</div>
                    <div className="text-xs text-slate-400 mt-1">{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal visual — hidden on small screens */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-1 border border-slate-700">
                <div className="bg-slate-900 rounded-xl p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-mono text-slate-400">forensic_analysis.exe</span>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <p className="text-slate-500">&gt; Analyzing evidence...</p>
                    <p className="text-blue-400">&gt; [████████████░░░] 87%</p>
                    <p className="text-slate-500">&gt; Extracting semantic context...</p>
                    <p className="text-slate-500">&gt; Generating report with citations...</p>
                    <p className="text-green-400 animate-pulse">&gt; ✓ Analysis Complete</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">Core Features</h2>
            <p className="text-slate-400 text-sm sm:text-xl">Focused tools for evidence review and report drafting</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: FileText, title: 'Evidence Upload', desc: 'Submit text files, PDFs, and image evidence' },
              { icon: Zap, title: 'Image-Aware Analysis', desc: 'Analyse crime scene photos with AI' },
              { icon: Lock, title: 'Role-Based Access', desc: 'Investigator, Officer, Reviewer, Admin roles' },
              { icon: BarChart3, title: 'Structured Reports', desc: 'Court-ready forensic reports with citations' },
            ].map((f, i) => (
              <div key={i} className="p-5 sm:p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500 transition-all group">
                <f.icon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400 mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 sm:py-20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-10 sm:mb-16">Who Uses ForensixAI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Users, role: 'Investigator', color: 'text-blue-400', desc: 'Creates cases and uploads crime scene evidence' },
              { icon: FileSearch, role: 'Forensic Officer', color: 'text-cyan-400', desc: 'Analyses evidence and generates AI reports' },
              { icon: Shield, role: 'Reviewer', color: 'text-yellow-400', desc: 'Approves or rejects reports before export' },
              { icon: Lock, role: 'Admin', color: 'text-red-400', desc: 'Manages users, cases, and audit logs' },
            ].map((r, i) => (
              <div key={i} className="p-5 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-xl border border-slate-700 text-center">
                <r.icon className={`w-8 h-8 ${r.color} mx-auto mb-3`} />
                <h3 className={`font-bold mb-2 ${r.color}`}>{r.role}</h3>
                <p className="text-slate-400 text-sm">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-10 sm:mb-16">How It Works</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { num: '1', title: 'Upload', desc: 'Drop evidence files' },
              { num: '2', title: 'Extract', desc: 'Read text or OCR images' },
              { num: '3', title: 'Analyse', desc: 'AI generates the report' },
              { num: '4', title: 'Approve', desc: 'Reviewer signs off' },
            ].map((step, i) => (
              <div key={i} className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-1 text-sm sm:text-base">{step.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border-t border-b border-slate-700">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold">Start an Evidence Review</h2>
          <p className="text-slate-300 text-sm sm:text-xl">Upload evidence and generate an AI-assisted draft report.</p>
          <button
            onClick={onNavigateToDashboard}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold text-base sm:text-lg transition-all"
          >
            Launch Application <ArrowRight size={20} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {['PDF and text extraction', 'Image evidence analysis', 'Report sections with citations'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 justify-center">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <div className="col-span-2 sm:col-span-1">
              <img src={forensixLogo} alt="Forensix AI" className="h-10 w-auto object-contain mb-3" />
              <p className="text-slate-400 text-sm">AI-assisted forensic report drafting.</p>
            </div>
            {[
              { title: 'Product', links: [
                { label: 'Launch App', action: onNavigateToDashboard },
              ]},
              { title: 'Resources', links: [
                { label: 'API Docs', href: 'https://forensix-ai.onrender.com/docs', external: true },
                { label: 'Source Code', href: 'https://github.com/Kavya-Jain-coder/Forensix-AI', external: true },
              ]},
              { title: 'Notes', links: [
                { label: 'AI-assisted output' },
                { label: 'Requires human review' },
              ]},
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {link.action ? (
                        <button onClick={link.action} className="text-slate-400 hover:text-white text-sm transition">{link.label}</button>
                      ) : link.href ? (
                        <a href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined} className="text-slate-400 hover:text-white text-sm transition">{link.label}</a>
                      ) : (
                        <span className="text-slate-500 text-sm">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-6 text-center text-slate-500 text-sm">
            &copy; 2026 ForensixAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
