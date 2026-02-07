
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { VideoMetadata, CalculationMode } from './types.ts';
import { getVideoDuration } from './services/videoProcessor.ts';
import { formatDuration, formatFileSize } from './utils/timeFormatter.ts';

const FileRow: React.FC<{ 
  item: VideoMetadata; 
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ item, onPlay, onRemove }) => {
  const extension = item.name.split('.').pop()?.toUpperCase() || 'VID';
  
  return (
    <div className={`group flex items-center justify-between p-4 rounded-xl transition-all border border-transparent hover:border-white/10 hover:bg-white/5 ${
      item.status === 'processing' ? 'bg-indigo-500/5 border-indigo-500/20' : ''
    }`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button 
          onClick={() => onPlay(item.id)}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg active:scale-90"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200 truncate" title={item.name}>{item.name}</span>
            <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] font-bold text-slate-500 rounded uppercase tracking-tighter shrink-0">{extension}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">{formatFileSize(item.size)}</span>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right">
          {item.status === 'completed' ? (
            <span className="font-mono font-bold text-emerald-400 text-sm">{formatDuration(item.duration)}</span>
          ) : item.status === 'processing' ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{item.step || 'Scanning'}</span>
            </div>
          ) : item.status === 'error' ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">Unsupported Format</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">In Queue</span>
          )}
        </div>
        <button onClick={() => onRemove(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [videoList, setVideoList] = useState<VideoMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.SUM);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const addFiles = useCallback((files: File[]) => {
    const newItems: VideoMetadata[] = [];
    const newFileMap = new Map(fileMap);
    files.forEach((file, idx) => {
      if (videoList.length + newItems.length >= 1000) return;
      const id = `${Date.now()}-${idx}-${Math.random()}`;
      newItems.push({ id, name: file.name, size: file.size, duration: 0, status: 'pending' });
      newFileMap.set(id, file);
    });
    setFileMap(newFileMap);
    setVideoList(prev => [...newItems, ...prev]);
  }, [fileMap, videoList.length]);

  const processBatch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const pending = videoList.filter(v => v.status === 'pending' || v.status === 'error');
    
    for (const item of pending) {
      const file = fileMap.get(item.id);
      if (!file) continue;
      
      setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, status: 'processing', step: 'ANALYZE' } : v));
      
      try {
        const result = await getVideoDuration(file, (step) => {
          setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, step } : v));
        });
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, duration: result.duration, status: 'completed' } : v));
      } catch (err) {
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, status: 'error' } : v));
      }
    }
    setIsProcessing(false);
  };

  const totals = useMemo(() => {
    const valid = videoList.filter(v => v.status === 'completed').map(v => v.duration);
    if (valid.length === 0) return 0;
    if (mode === CalculationMode.SUM) return valid.reduce((a, b) => a + b, 0);
    if (mode === CalculationMode.AVERAGE) return valid.reduce((a, b) => a + b, 0) / valid.length;
    if (mode === CalculationMode.MAX) return Math.max(...valid);
    return Math.min(...valid);
  }, [videoList, mode]);

  const removeFile = (id: string) => {
    setVideoList(prev => prev.filter(v => v.id !== id));
    const newMap = new Map(fileMap);
    newMap.delete(id);
    setFileMap(newMap);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 lg:p-12 gap-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">UltraCalc <span className="text-indigo-500 italic">PRO</span></h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Professional Batch Video Duration Engine • Client-Side Only</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => { setVideoList([]); setFileMap(new Map()); }} 
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs uppercase tracking-widest transition-all border border-white/5"
          >
            Clear All
          </button>
          <button 
            disabled={isProcessing || videoList.filter(v => v.status !== 'completed').length === 0}
            onClick={processBatch}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-20 flex items-center gap-3"
          >
            {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
            {isProcessing ? 'Processing...' : 'Run Analysis'}
          </button>
        </div>
      </header>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left: Controls & Hero Stat */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Main Display Card */}
          <div className="glass rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] border border-white/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(videoList.filter(v => v.status === 'completed').length / (videoList.length || 1)) * 100}%` }} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Final Aggregate</p>
            <div className="text-6xl font-black text-white font-mono tracking-tighter select-all">{formatDuration(totals)}</div>
            <p className="text-indigo-400/60 text-[10px] font-bold mt-4 tracking-widest">HOURS : MINUTES : SECONDS</p>
            
            <div className="mt-10 flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
              {(Object.keys(CalculationMode) as Array<keyof typeof CalculationMode>).map((m) => (
                <button 
                  key={m}
                  onClick={() => setMode(CalculationMode[m])}
                  className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    mode === CalculationMode[m] ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m === 'SUM' ? 'Total' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Box */}
          <label className="group block glass rounded-[32px] p-8 border-2 border-dashed border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Import Media Assets</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Up to 1000 files supported</p>
            </div>
            <input 
              type="file" 
              multiple 
              accept="video/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </label>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-5 rounded-3xl border border-white/5">
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Queue Size</p>
               <p className="text-2xl font-black text-white">{videoList.length}</p>
            </div>
            <div className="glass p-5 rounded-3xl border border-white/5">
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Verified</p>
               <p className="text-2xl font-black text-emerald-500">{videoList.filter(v => v.status === 'completed').length}</p>
            </div>
          </div>
        </div>

        {/* Right: File List Area */}
        <div className="lg:col-span-8 flex flex-col min-h-[600px]">
          <div className="glass rounded-[32px] border border-white/10 overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Inventory</h3>
              {videoList.length > 0 && (
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded font-bold uppercase">
                  {Math.round((videoList.filter(v => v.status === 'completed').length / videoList.length) * 100)}% Verified
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {videoList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <svg className="w-16 h-16 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <p className="text-xs font-bold uppercase tracking-[0.3em]">No Assets Detected</p>
                </div>
              ) : (
                videoList.map(v => <FileRow key={v.id} item={v} onPlay={setPlayingVideoId} onRemove={removeFile} />)
              )}
            </div>
            
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Success</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Incompatible</span>
                  </div>
               </div>
               <p className="text-[10px] text-slate-500 font-bold uppercase italic">Processing takes place 100% on your device</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Video Player Overlay */}
      {playingVideoId && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8">
           <div className="absolute top-8 right-8">
             <button 
              onClick={() => setPlayingVideoId(null)}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all active:scale-90"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
           <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <video 
                autoPlay 
                controls 
                className="w-full h-full object-contain"
                src={URL.createObjectURL(fileMap.get(playingVideoId)!)}
              />
           </div>
           <div className="absolute bottom-12 text-center">
              <h4 className="text-xl font-bold text-white mb-1">{fileMap.get(playingVideoId)!.name}</h4>
              <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Metadata Quick Player</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
