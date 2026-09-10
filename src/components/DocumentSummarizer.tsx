import React, { useState } from 'react';
import { FileText, Upload, Sparkles, CheckCircle2, ListChecks, ArrowRight, FileCheck, Loader2 } from 'lucide-react';
import { DocumentSummaryResult } from '../types';
import { playJarvisSound } from '../utils/audioSynth';

interface DocumentSummarizerProps {
  soundEnabled: boolean;
}

const SAMPLE_DOCS = [
  {
    title: 'Autonomous AI Agents Architecture 2026.pdf',
    type: 'pdf' as const,
    content: `EXECUTIVE BRIEFING: MULTI-MODEL AGENT INFRASTRUCTURE (2026)
    
Abstract:
Modern autonomous personal agents require deterministic resilience against API rate-limiting, token saturation, and provider outages. By deploying a layered multi-model cascading router—combining Google Gemini 3.8 Flash as the high-throughput reasoning baseline, Groq LLaMA 3.3 for sub-200ms failover, and local edge rule engines—developers achieve 99.99% operational continuity at strictly zero incremental software license cost.

Key Observations:
1. Human-in-the-loop verification remains mandatory for any external social posting or email broadcast to mitigate unauthorized publishing risks.
2. Safe browser automation requires explicit tab-level authorization tokens enforced via Manifest V3 content scripts rather than silent full-access execution.
3. Lightweight local JSON databases and client-side memory stores offer instantaneous zero-cost persistence for personal task and schedule management without requiring dedicated paid cloud databases.

Strategic Action Points:
- Implement immediate fallback listeners on HTTP 429 quota exhaustion.
- Enforce strict manual approval modal gates for all external social media publishing pipelines.
- Standardize on open web APIs and client-side browser extension controllers.`
  },
  {
    title: 'Product Roadmap & Creator Strategy.pptx',
    type: 'pptx' as const,
    content: `SLIDE 1: PRODUCT & CONTENT GROWTH MATRIX
Presenter: Strategic AI Systems Lab
Date: September 2026

SLIDE 2: THE 3-PILLAR ACCELERATOR
• Pillar 1: High-Retention Video Formats (Hooks tested on YouTube Shorts and Instagram Reels).
• Pillar 2: Frictionless Multi-Platform Scheduling with Human-in-the-Loop Sign-Off.
• Pillar 3: Real-Time Grounded Web Research to capture breakout search queries within 60 minutes of release.

SLIDE 3: OPERATIONAL METRICS & GOALS
- Target 25K YouTube views on long-form breakdowns.
- Eliminate all manual video pause/scroll context switching using the Jarvis Companion browser controller.
- Achieve 100% zero-cost software overhead using free-tier cloud models.`
  }
];

export const DocumentSummarizer: React.FC<DocumentSummarizerProps> = ({ soundEnabled }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DocumentSummaryResult | null>(null);
  const [inputText, setInputText] = useState('');
  const [docName, setDocName] = useState('');

  const processTextForSummary = async (text: string, fileName: string, fileType: string) => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fileName, fileType })
      });

      if (res.ok) {
        const data = await res.json();
        setSummaryResult(data);
        if (soundEnabled) playJarvisSound('action_done');
      } else {
        alert('Failed to generate summary. Please check your document text.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while processing document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    setDocName(fileName);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      await processTextForSummary(content, fileName, ext);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async (sample: typeof SAMPLE_DOCS[0]) => {
    setDocName(sample.title);
    setInputText(sample.content);
    if (soundEnabled) playJarvisSound('command_ack');
    await processTextForSummary(sample.content, sample.title, sample.type);
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Header */}
      <div className="border-b border-cyan-500/20 pb-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold text-sm text-cyan-300">
            DOCUMENT SUMMARIZER & ANALYST
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
          FREE PARSING ENGINE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Upload Zone */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-dashed border-cyan-500/40 hover:border-cyan-400/80 transition-all text-center space-y-3">
          <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
          <div>
            <div className="font-mono text-xs text-slate-200 font-semibold">
              Drag and drop your PDF, PPTX, or TXT file here
            </div>
            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
              100% Client & Free-tier server parsing. Zero paid cloud document services required.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs transition-colors">
              <span>Select File from Computer</span>
              <input
                type="file"
                accept=".pdf,.pptx,.txt,.doc,.docx,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Sample Documents for instant testing */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">Or test with demo decks:</span>
            {SAMPLE_DOCS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadSample(sample)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-slate-700 transition-colors"
              >
                📄 {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isUploading && (
          <div className="p-8 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-center font-mono text-xs space-y-3">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
            <div className="text-cyan-300">Jarvis is distilling document insights & extracting key takeaways...</div>
            <div className="text-slate-500 text-[10px]">Calling free-tier multi-model inference pipeline</div>
          </div>
        )}

        {/* Summarization Results Card */}
        {summaryResult && !isUploading && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 font-mono text-xs space-y-4 shadow-xl">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">{summaryResult.fileName}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{summaryResult.extractedWordCount} words</span>
                <span>•</span>
                <span className="text-cyan-400">{summaryResult.providerUsed}</span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-1.5">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>EXECUTIVE SUMMARY</span>
              </div>
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px]">
                {summaryResult.executiveSummary}
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="space-y-1.5">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>KEY STRATEGIC TAKEAWAYS</span>
              </div>
              <div className="space-y-1">
                {summaryResult.keyTakeaways.map((takeaway, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300 text-[11px]">
                    <span className="text-cyan-400">•</span>
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items */}
            <div className="space-y-1.5">
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />
                <span>ACTION ITEMS & NEXT STEPS</span>
              </div>
              <div className="space-y-1">
                {summaryResult.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300 text-[11px]">
                    <span className="text-amber-400">→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
