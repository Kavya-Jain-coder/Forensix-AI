import React, { useState } from 'react';
import { FileText, Zap, Lock, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';
import forensixLogo from '../assets/forensix-logo.png';

export default function Home({ onNavigateToDashboard }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src={forensixLogo} alt="Forensix AI" className="h-14 w-auto object-contain" />
          </div>
          <button 
            onClick={onNavigateToDashboard}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-300"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  AI-Powered <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Forensic Analysis</span>
                </h1>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Transform evidence into insights. ForensixAI uses advanced AI and semantic search to generate comprehensive forensic reports in seconds.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={onNavigateToDashboard}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  Start Analyzing <ArrowRight size={20} />
                </button>
              </div>

              {/* Capabilities */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-2xl font-bold text-blue-400">PDF</div>
                  <div className="text-sm text-slate-400">Text Evidence</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-2xl font-bold text-cyan-400">IMG</div>
                  <div className="text-sm text-slate-400">Visual Evidence</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-2xl font-bold text-purple-400">RAG</div>
                  <div className="text-sm text-slate-400">Cited Context</div>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-1 border border-slate-700">
                <div className="bg-slate-900 rounded-xl p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
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

      {/* Features Section */}
      <section id="features" className="py-20 px-8 bg-slate-800/30 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-xl text-slate-400">Focused tools for evidence review and report drafting</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: "Evidence Upload", desc: "Submit text files, PDFs, and image evidence" },
              { icon: Zap, title: "Image-Aware Analysis", desc: "Use Gemini vision when images contain no OCR text" },
              { icon: Lock, title: "Controlled Inputs", desc: "Reports are generated from the uploaded evidence only" },
              { icon: BarChart3, title: "Structured Reports", desc: "Receive summary, observations, analysis, limits, and conclusion" }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-800/70 transition-all duration-300 group">
                <feature.icon className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="workflow" className="py-20 px-8 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Upload", desc: "Drop your evidence file" },
              { num: "2", title: "Extract", desc: "Read text or inspect image content" },
              { num: "3", title: "Retrieve", desc: "Collect relevant evidence segments" },
              { num: "4", title: "Report", desc: "Draft a structured forensic report" }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-slate-700 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                </div>
                {i < 3 && <div className="hidden md:block absolute top-1/3 -right-3 w-6 h-px bg-gradient-to-r from-blue-600 to-transparent"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border-t border-b border-slate-700">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4">Start an Evidence Review</h2>
            <p className="text-xl text-slate-300">Upload evidence and generate an AI-assisted draft report with cited context.</p>
          </div>

          <button
            onClick={onNavigateToDashboard}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
          >
            Launch Application <ArrowRight size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {["PDF and text extraction", "Image evidence analysis", "Report sections with citations"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 justify-center">
                <CheckCircle size={20} className="text-green-400" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={forensixLogo} alt="Forensix AI" className="h-12 w-auto object-contain" />
              </div>
              <p className="text-slate-400">AI-assisted forensic report drafting from uploaded evidence.</p>
            </div>
            {[
              { title: "Product", links: [
                { label: "Features", href: "#features" },
                { label: "Workflow", href: "#workflow" },
                { label: "Launch App", action: onNavigateToDashboard }
              ] },
              { title: "Resources", links: [
                { label: "API Docs", href: "https://forensix-ai.onrender.com/docs", external: true },
                { label: "Source Code", href: "https://github.com/Kavya-Jain-coder/Forensix-AI", external: true },
                { label: "Deployment Notes", href: "https://github.com/Kavya-Jain-coder/Forensix-AI/blob/main/DEPLOYMENT.md", external: true }
              ] },
              { title: "Notes", links: [
                { label: "AI-assisted output" },
                { label: "Requires human review" },
                { label: "Evidence-only prompts" }
              ] }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.action ? (
                        <button type="button" onClick={link.action} className="text-left text-slate-400 hover:text-white transition">
                          {link.label}
                        </button>
                      ) : link.href ? (
                        <a
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noreferrer' : undefined}
                          className="text-slate-400 hover:text-white transition"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <span className="text-slate-500">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400">
            <p>&copy; 2026 ForensixAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
