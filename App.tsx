
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ThreatScene from './components/ThreatScene';
import PipelineVisualizer from './components/PipelineVisualizer';
import RiskHeatmap from './components/RiskHeatmap';
import TimelineReplay from './components/TimelineReplay';
import HistoryMetrics from './components/HistoryMetrics';
import SupplyChainView from './components/SupplyChainView';
import ProtectionChart from './components/ProtectionChart';
import SecurityMemory from './components/SecurityMemory';
import PolicyCenter from './components/PolicyCenter';
import { PipelineStage, PipelineStatus, Vulnerability, SecurityVerdict } from './types';
import { INITIAL_PIPELINE_STAGES } from './constants';
import { analyzeVulnerability, generateVerdict, suggestFix } from './services/geminiService';
import { fetchRepoContext, orchestrateScan, RepoMetadata, ScanLog } from './services/scannerService';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('Intelligence Space');
  const [isStarted, setIsStarted] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoMetadata, setRepoMetadata] = useState<RepoMetadata | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_PIPELINE_STAGES);
  const [status, setStatus] = useState(PipelineStatus.IDLE);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<SecurityVerdict | null>(null);
  const [isHealing, setIsHealing] = useState(false);
  const [fixData, setFixData] = useState<{ fix: string, diff: string } | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [entropy, setEntropy] = useState(0.012);
  const [darkMode, setDarkMode] = useState(true);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Sync dark mode state with the document root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEntropy(prev => Math.max(0.001, Math.min(0.999, prev + (Math.random() - 0.5) * 0.05)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (log: ScanLog) => setLogs(prev => [...prev, log]);

  const handleReset = () => {
    setIsStarted(false);
    setRepoUrl('');
    setRepoMetadata(null);
    setVulnerabilities([]);
    setStatus(PipelineStatus.IDLE);
    setStages(INITIAL_PIPELINE_STAGES.map(s => ({ ...s, status: 'PENDING' })));
    setVerdict(null);
    setReasoning(null);
    setFixData(null);
    setLogs([]);
    setSelectedVuln(null);
    setActiveView('Intelligence Space');
    addLog({ timestamp: new Date().toLocaleTimeString(), level: 'SYSTEM', message: 'Core reset successful. Environmental memory purged.' });
  };

  const updateStageStatus = (id: string, stageStatus: 'RUNNING' | 'COMPLETED' | 'ERROR') => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, status: stageStatus } : s)));
  };

  const initiateAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoUrl) return;

    setIsStarted(true);
    setStatus(PipelineStatus.SCANNING);
    setStages(INITIAL_PIPELINE_STAGES.map(s => ({ ...s, status: 'PENDING' })));
    setVulnerabilities([]);
    setVerdict(null);
    setReasoning(null);
    setFixData(null);
    setLogs([]);

    addLog({ timestamp: new Date().toLocaleTimeString(), level: 'SYSTEM', message: 'Activating 8-Layer ML Defense Pipeline...' });

    const metadata = await fetchRepoContext(repoUrl);
    setRepoMetadata(metadata);
    
    if (metadata) {
      const results = await orchestrateScan(metadata, addLog, updateStageStatus);
      setVulnerabilities(results);
      
      addLog({ timestamp: new Date().toLocaleTimeString(), level: 'SYSTEM', message: 'Synthesizing Verdict (Weighted Bayesian)...' });
      const finalVerdict = await generateVerdict(results);
      setVerdict(finalVerdict);
      setStatus(finalVerdict.result === 'FAIL' ? PipelineStatus.FAILED : PipelineStatus.PASSED);
      addLog({ timestamp: new Date().toLocaleTimeString(), level: 'SYSTEM', message: `Audit Finalized. Posture: ${finalVerdict.result}` });

      setAuditHistory(prev => [
        {
          date: new Date().toLocaleString(),
          repo: metadata.name,
          vuln: results.length > 0 ? results[0].title : 'Clean Scan',
          status: finalVerdict.result,
          savings: results.length > 0 ? `$${(results.length * 15).toFixed(0)}k` : '$0'
        },
        ...prev
      ]);
    }
  };

  const examineFinding = async (vuln: Vulnerability) => {
    setSelectedVuln(vuln);
    setReasoning('Interrogating XAI Attribution Layer (SHAP values)...');
    const analysis = await analyzeVulnerability(vuln);
    setReasoning(analysis);
  };

  const applySelfHeal = async () => {
    if (!selectedVuln) return;
    setIsHealing(true);
    addLog({ timestamp: new Date().toLocaleTimeString(), level: 'SYSTEM', message: `Triggering Patch Synthesis for ${selectedVuln.id}` });
    const suggestion = await suggestFix(selectedVuln);
    setFixData(suggestion);
    setIsHealing(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: { systemInstruction: "You are the CodeFortress Security AI. Help users navigate CI/CD security." }
      });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "Connection lost." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Service error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderDashboard = () => (
    <div className="flex-1 overflow-y-auto p-12 bg-transparent flex flex-col gap-10 min-h-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-semibold text-[#2C2621] dark:text-white tracking-tight">Enterprise ML Console</h2>
          <p className="text-[#7A7267] dark:text-[#9CA3AF] text-sm mt-1 uppercase tracking-widest font-medium opacity-60">Architecture: 8-Layer Autonomous Defense</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#F5EFDF] dark:bg-[#161B22] px-4 py-2 rounded-full border border-[#B8860B]/10 dark:border-white/5 shadow-2xl">
             <div className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
             <span className="text-[10px] font-black uppercase text-[#2C2621] dark:text-white/80 tracking-widest">Neural Cluster: {repoMetadata ? 'ACTIVE' : 'IDLE'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-6 bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2rem] p-10 border border-[#B8860B]/10 dark:border-[#FFD369]/10 shadow-2xl relative overflow-hidden group transition-theme">
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <h3 className="text-xl font-bold text-[#2C2621] dark:text-white mb-2">Autonomous Target Link</h3>
              <p className="text-xs text-[#7A7267] dark:text-[#9CA3AF] leading-relaxed">Initiate the 8-Layer ML Pipeline.</p>
            </div>
            
            <form onSubmit={initiateAnalysis} className="flex flex-col gap-6">
              <div 
                className="relative border-2 border-dashed border-[#B8860B]/10 dark:border-white/10 rounded-2xl p-10 group-hover:border-[#B8860B]/40 dark:group-hover:border-[#FFD369]/40 transition-all bg-black/5 dark:bg-black/20 flex flex-col items-center justify-center gap-4 cursor-pointer"
                onClick={() => document.getElementById('repoInput')?.focus()}
              >
                <div className="text-center">
                  <p className="text-[11px] font-black text-[#2C2621] dark:text-white uppercase tracking-[0.2em] mb-1">Target Identity</p>
                  <p className="text-[10px] text-[#7A7267] dark:text-[#9CA3AF] opacity-60 truncate max-w-[300px]">{repoMetadata ? `${repoMetadata.owner} / ${repoMetadata.name}` : 'Awaiting Registry Link...'}</p>
                </div>
                <input 
                  id="repoInput"
                  type="text" 
                  placeholder="https://github.com/org/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-[#B8860B]/10 dark:border-white/10 px-6 py-4 rounded-xl text-[#2C2621] dark:text-white text-xs outline-none focus:border-[#B8860B]/50 dark:focus:border-[#FFD369]/50 transition-all jetbrains-mono text-center shadow-inner"
                />
              </div>
              <button 
                type="submit" 
                disabled={status === PipelineStatus.SCANNING || !repoUrl}
                className="w-full py-5 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] font-black uppercase tracking-[0.5em] text-[11px] rounded-xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {status === PipelineStatus.SCANNING ? 'Executing Inference Cycle...' : 'Initialize Secure Audit'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-black dark:bg-[#000] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
           <div className="bg-[#EBE4D3] dark:bg-[#1C2128] px-6 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between transition-theme">
              <span className="text-[9px] font-black uppercase text-[#7A7267] dark:text-[#9CA3AF] tracking-widest">Neural Cluster Logs</span>
              {repoMetadata && <span className="text-[9px] text-[#22C55E] animate-pulse uppercase">Streaming_Live</span>}
           </div>
           <div className="flex-1 p-6 font-mono text-[10px] overflow-y-auto leading-relaxed h-[250px] scrollbar-hide">
              {logs.length === 0 && <p className="text-white/20 italic">Awaiting layer initialization...</p>}
              {logs.map((l, i) => (
                <div key={i} className="mb-1.5 flex gap-3">
                   <span className={`font-black shrink-0 ${l.level === 'ERROR' ? 'text-red-500' : l.level === 'WARN' ? 'text-yellow-500' : l.level === 'SYSTEM' ? 'text-blue-400' : 'text-green-500'}`}>
                     [{l.level}]
                   </span>
                   <span className="text-white/80">{l.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
           </div>
        </div>
      </div>

      <div className="bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2rem] p-10 border border-[#B8860B]/5 dark:border-white/5 shadow-2xl flex flex-col gap-8 transition-theme">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#2C2621] dark:text-white">Autonomous ML Stream</h3>
          <div className="flex gap-4">
             <button onClick={() => setActiveView('Attack Simulator')} className="px-8 py-3 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">Review ML Findings ({vulnerabilities.length})</button>
          </div>
        </div>
        <PipelineVisualizer stages={stages} currentStatus={status} />
      </div>

      <div className="grid grid-cols-12 gap-8 min-h-[400px]">
        <div className="col-span-8 bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2rem] p-10 border border-[#B8860B]/5 dark:border-white/5 shadow-2xl flex flex-col transition-theme">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#B8860B] dark:text-[#FFD369]">Defense Integrity Score</h3>
              <span className="text-[10px] text-[#2C2621]/40 dark:text-white/40 uppercase font-bold">Timeframe: Real-time Replay</span>
           </div>
           <div className="flex-1">
             <ProtectionChart />
           </div>
        </div>

        <div className="col-span-4 bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2rem] p-10 border border-[#B8860B]/5 dark:border-white/5 shadow-2xl flex flex-col gap-8 transition-theme">
           <div className="h-1/2 flex items-center justify-center relative">
              <ThreatScene />
           </div>
           <div className="h-1/2 flex flex-col gap-4 overflow-hidden">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#B8860B] dark:text-[#FFD369]">Inference Replay</h3>
              <div className="flex-1 overflow-y-auto">
                <TimelineReplay logs={logs} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'Intelligence Space': return renderDashboard();
      case 'Attack Simulator': return (
        <div className="flex-1 p-16 flex flex-col gap-12 bg-transparent overflow-y-auto">
          <div className="flex justify-between items-end">
            <h2 className="text-4xl font-light text-[#2C2621] dark:text-white">Neural <span className="font-bold">Threat Intelligence</span></h2>
            {repoMetadata && <span className="text-[11px] font-black uppercase tracking-widest text-[#B8860B] dark:text-[#FFD369]">{repoMetadata.owner} / {repoMetadata.name}</span>}
          </div>
          <div className="grid grid-cols-2 gap-12 pb-24">
            {vulnerabilities.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-40 opacity-20">
                 <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                 <p className="text-xl font-black uppercase tracking-[0.5em] mt-8 text-[#2C2621] dark:text-white">Awaiting Inference Cycle</p>
              </div>
            )}
            {vulnerabilities.map(v => (
              <div key={v.id} onClick={() => examineFinding(v)} className="bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2.5rem] p-12 border border-[#B8860B]/5 dark:border-white/5 hover:border-[#B8860B]/40 dark:hover:border-[#FFD369]/40 cursor-pointer group transition-all shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between mb-4">
                  <span className="text-[11px] font-black text-red-500 uppercase tracking-widest bg-red-500/5 px-3 py-1 rounded">{v.id}</span>
                  <span className="text-[10px] font-bold text-[#7A7267] dark:text-[#9CA3AF] tracking-widest">{v.type} ML CORE</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2C2621] dark:text-white mb-6 group-hover:text-[#B8860B] dark:group-hover:text-[#FFD369] transition-colors">{v.title}</h3>
                <div className="space-y-4">
                  {v.exploitPath?.map((step, i) => (
                    <div key={i} className="flex items-center gap-4 text-xs font-black uppercase text-[#2C2621]/60 dark:text-white/60">
                      <div className="w-6 h-6 rounded-full border border-[#B8860B]/40 dark:border-[#FFD369]/40 flex items-center justify-center text-[8px] text-[#B8860B] dark:text-[#FFD369] font-black">{i+1}</div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'History': return <HistoryMetrics auditHistory={auditHistory} />;
      case 'Risk Heatmaps': return (
        <div className="flex-1 p-16 bg-transparent flex flex-col gap-10 overflow-y-auto">
           <h2 className="text-4xl font-light text-[#2C2621] dark:text-white">Real-time <span className="font-bold">Risk Concentration</span></h2>
           <div className="flex-1 min-h-[500px]">
             <RiskHeatmap vulnerabilities={vulnerabilities} repoName={repoMetadata?.name || null} />
           </div>
        </div>
      );
      case 'Supply Chain': return <SupplyChainView />;
      case 'Security Memory': return <SecurityMemory repoMetadata={repoMetadata} />;
      case 'Policy Center': return <PolicyCenter />;
      default: return (
        <div className="flex-1 flex items-center justify-center bg-transparent">
           <p className="text-4xl font-black opacity-10 italic uppercase tracking-[1em] text-[#2C2621] dark:text-white">{activeView}</p>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-transparent text-[#2C2621] dark:text-[#E5E7EB] overflow-hidden transition-theme">
      <Sidebar 
        onNavigate={setActiveView} 
        activeView={activeView} 
        onSwitchRepo={handleReset} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
      />
      <main className="flex-1 flex flex-col min-h-0 relative bg-transparent">
        <header className="h-28 border-b border-[#B8860B]/10 dark:border-white/5 flex items-center justify-between px-16 bg-[#FDFBF7]/90 dark:bg-[#0B0E14]/90 backdrop-blur-md z-30 transition-theme">
          <div className="flex items-center gap-16">
            <div className="flex flex-col">
               <span className="text-[9px] text-[#7A7267] dark:text-[#9CA3AF] uppercase tracking-[0.4em] font-black">Cluster Entropy</span>
               <span className="text-xl font-bold jetbrains-mono text-[#2C2621] dark:text-white mt-1">{(entropy * 100).toFixed(3)}%</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] text-[#7A7267] dark:text-[#9CA3AF] uppercase tracking-[0.4em] font-black">Audit Context</span>
               <span className="text-[12px] font-bold mt-1 text-[#2C2621] dark:text-white">{repoMetadata?.name || 'Idle'}</span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
             <button onClick={handleReset} className="px-6 py-3 border border-[#B8860B]/10 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black/5 transition-all text-[#2C2621] dark:text-white">Onboard New Target</button>
             <button onClick={initiateAnalysis} disabled={status === PipelineStatus.SCANNING} className="px-10 py-4 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] text-[10px] font-black uppercase tracking-[0.4em] rounded shadow-xl disabled:opacity-40"> Execute High-Integrity Audit </button>
          </div>
        </header>

        {renderContent()}

        {/* Floating Chat */}
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-12 right-12 w-16 h-16 bg-[#B8860B] dark:bg-[#FFD369] rounded-full shadow-2xl z-[100] flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#0B0E14" : "#FFFFFF"} strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </button>
        <AnimatePresence>
          {isChatOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} className="fixed bottom-32 right-12 w-[400px] h-[550px] bg-[#F5EFDF] dark:bg-[#161B22] rounded-[2.5rem] shadow-2xl z-[100] border border-[#B8860B]/10 dark:border-white/10 flex flex-col overflow-hidden transition-theme">
              <div className="p-7 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] flex justify-between items-center font-black uppercase text-[11px] tracking-widest">Security AI Assistant</div>
              <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-5">
                {chatMessages.length === 0 && <p className="text-[#2C2621]/20 dark:text-white/20 text-center mt-10 italic">Awaiting neural query...</p>}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-4 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-[#EBE4D3] dark:bg-[#1C2128] text-[#2C2621] dark:text-white' : 'bg-white dark:bg-[#0B0E14] text-[#2C2621] dark:text-[#E5E7EB] border border-[#B8860B]/5 dark:border-white/5'}`}>{msg.text}</div>
                  </div>
                ))}
                {isTyping && <div className="text-[10px] text-[#B8860B] dark:text-[#FFD369] animate-pulse">Neural engine thinking...</div>}
              </div>
              <form onSubmit={handleChatSubmit} className="p-5 bg-white/50 dark:bg-[#0B0E14] border-t border-[#B8860B]/5 dark:border-white/5 flex gap-3"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query intelligence core..." className="flex-1 bg-white dark:bg-[#1C2128] border border-[#B8860B]/10 dark:border-white/10 rounded-2xl px-5 py-4 text-xs outline-none text-[#2C2621] dark:text-white"/><button type="submit" className="p-4 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] rounded-2xl shadow-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remediate Sidepanel */}
        <AnimatePresence>
          {selectedVuln && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} className="absolute inset-y-0 right-0 w-[650px] bg-[#FDFBF7] dark:bg-[#161B22] z-[60] border-l border-[#B8860B]/10 dark:border-white/10 shadow-[-100px_0_200px_rgba(0,0,0,0.1)] dark:shadow-[-100px_0_200px_rgba(0,0,0,0.5)] p-16 flex flex-col gap-10 overflow-y-auto transition-theme">
               <div className="flex justify-between items-center"><div><span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#B8860B] dark:text-[#FFD369]">Remediation Terminal</span><h2 className="text-3xl font-light mt-2 text-[#2C2621] dark:text-white">{selectedVuln.id}</h2></div><button onClick={() => { setSelectedVuln(null); setFixData(null); }} className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
               <div className="flex flex-col gap-10">
                  <div className="p-10 bg-[#F5EFDF] dark:bg-[#1C2128] rounded-[2rem] text-sm leading-relaxed text-[#2C2621] dark:text-[#E5E7EB] border-l-8 border-[#B8860B] dark:border-[#FFD369] shadow-2xl relative transition-theme">
                     <span className="text-[10px] font-black uppercase text-[#7A7267] dark:text-[#9CA3AF] mb-4 block">XAI Attribution Analysis</span>
                     {reasoning}
                  </div>
                  {fixData ? (
                    <div className="p-12 bg-[#22C55E]/5 rounded-[2.5rem] border border-[#22C55E]/20">
                      <pre className="text-[11px] jetbrains-mono text-[#22C55E] opacity-90 mb-8 whitespace-pre-wrap">{fixData.diff}</pre>
                      <button className="w-full py-7 bg-[#22C55E] text-white dark:text-[#0B0E14] text-[12px] font-black uppercase tracking-[0.6em] rounded-2xl shadow-2xl">Deploy Verified Patch</button>
                    </div>
                  ) : (
                    <button onClick={applySelfHeal} disabled={isHealing} className="w-full py-9 bg-[#B8860B] dark:bg-[#FFD369] text-white dark:text-[#0B0E14] text-[12px] font-black uppercase tracking-[0.6em] rounded-2xl shadow-2xl disabled:opacity-40">
                      {isHealing ? 'Synthesizing Solution...' : 'Engage Autonomous Repair'}
                    </button>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
