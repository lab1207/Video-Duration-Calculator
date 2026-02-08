
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { VideoMetadata, CalculationMode } from './types.ts';
import { getVideoDuration } from './services/videoProcessor.ts';
import { formatDuration, formatFileSize } from './utils/timeFormatter.ts';
import { GoogleGenAI, Type } from "@google/genai";

const FileRow: React.FC<{ 
  item: VideoMetadata; 
  onRemove: (id: string) => void;
}> = ({ item, onRemove }) => {
  return (
    <div className="group flex items-center justify-between p-4 rounded-xl transition-all border border-white/5 hover:bg-white/5 hover:border-white/10">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors ${
          item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
          item.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-500'
        }`}>
          {item.status === 'processing' ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : item.status === 'completed' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-200 truncate">{item.name}</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatFileSize(item.size)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          {item.status === 'completed' ? (
            <span className="font-mono font-bold text-emerald-400 text-base">{formatDuration(item.duration)}</span>
          ) : item.status === 'error' ? (
            <span className="text-[9px] font-black uppercase text-red-500">Unreadable</span>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 animate-pulse">{item.step || 'Processing'}</span>
          )}
        </div>
        <button onClick={() => onRemove(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [videoList, setVideoList] = useState<VideoMetadata[]>([]);
  const [fileMap] = useState<Map<string, File>>(new Map());
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.SUM);
  const processingRef = useRef<Set<string>>(new Set());

  const processVideo = useCallback(async (item: VideoMetadata) => {
    if (processingRef.current.has(item.id)) return;
    processingRef.current.add(item.id);

    const file = fileMap.get(item.id);
    if (!file) return;

    try {
      // 1. Try Local Fast Repair (Binary + Seek-to-end)
      const result = await getVideoDuration(file, (step) => {
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, step } : v));
      });
      setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, duration: result.duration, status: 'completed', step: undefined } : v));
    } catch (err) {
      // 2. AI Fallback ONLY as a last resort
      try {
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, step: 'AI Analysis' } : v));
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: "Return ONLY the precise duration in seconds for this video." }, { inlineData: { mimeType: file.type || 'video/mp4', data: base64 } }] }],
          config: { responseMimeType: "application/json", responseSchema: { type: Type.NUMBER } }
        });
        const duration = Number(response.text);
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, duration: !isNaN(duration) ? duration : 0, status: 'completed', step: undefined } : v));
      } catch {
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, status: 'error', step: undefined } : v));
      }
    } finally {
      processingRef.current.delete(item.id);
    }
  }, [fileMap]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: VideoMetadata[] = [];
    files.forEach((file, idx) => {
      const id = `${Date.now()}-${idx}-${Math.random()}`;
      newItems.push({ id, name: file.name, size: file.size, duration: 0, status: 'processing', step: 'Loading' });
      fileMap.set(id, file);
    });
    setVideoList(prev => [...prev, ...newItems]);
    newItems.forEach(item => processVideo(item));
  }, [fileMap, processVideo]);

  const totals = useMemo(() => {
    const valid = videoList.filter(v => v.status === 'completed').map(v => v.duration);
    if (valid.length === 0) return 0;
    return mode === CalculationMode.SUM ? valid.reduce((a, b) => a + b, 0) : valid.reduce((a, b) => a + b, 0) / valid.length;
  }, [videoList, mode]);

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-12 gap-8 max-w-[1200px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">UltraCalc <span className="text-indigo-500">Pro</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Local Auto-Repair Engine Active</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase text-slate-400">System Ready</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-3xl p-8 border border-white/10 text-center shadow-2xl relative overflow-hidden">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Combined Duration</p>
            <div className="text-5xl font-black text-white font-mono relative z-10 tabular-nums">{formatDuration(totals)}</div>
            <div className="mt-6 flex justify-center gap-2 relative z-10">
              {['SUM', 'AVERAGE'].map(m => (
                <button 
                  key={m} 
                  onClick={() => setMode(m as CalculationMode)} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                >
                  {m === 'SUM' ? 'Total' : 'Avg'}
                </button>
              ))}
            </div>
          </div>

          <label className="group block glass rounded-3xl p-10 border-2 border-dashed border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer text-center relative overflow-hidden">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-indigo-600 transition-all mb-4 text-white group-hover:scale-110">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-xl font-black text-slate-200 uppercase tracking-tight">Drop Files</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Instant Auto-Process</p>
            <input type="file" multiple accept="video/*" className="hidden" onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }} />
          </label>
        </div>

        <div className="lg:col-span-8 glass rounded-3xl border border-white/10 overflow-hidden flex flex-col min-h-[500px] shadow-2xl">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace ({videoList.length})</span>
            <button 
              onClick={() => { setVideoList([]); fileMap.clear(); processingRef.current.clear(); }} 
              className="text-[9px] text-red-500/60 hover:text-red-500 font-black uppercase tracking-widest transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
            >
              Clear Workspace
            </button>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
            {videoList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-20 py-20">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                <p className="text-xs font-black uppercase tracking-[0.4em]">Ready for videos</p>
              </div>
            ) : videoList.map(v => (
              <FileRow key={v.id} item={v} onRemove={id => { setVideoList(prev => prev.filter(x => x.id !== id)); fileMap.delete(id); }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
