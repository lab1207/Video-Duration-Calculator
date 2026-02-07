
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { VideoMetadata, CalculationMode } from './types.ts';
import { getVideoDuration } from './services/videoProcessor.ts';
import { formatDuration, formatFileSize } from './utils/timeFormatter.ts';

/**
 * VLC-ULTRA MEDIA PLAYER COMPONENT
 */
const AdvancedPlayer: React.FC<{ 
  file: File | undefined; 
  onClose: () => void 
}> = ({ file, onClose }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<{title: string, msg: string} | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!file) {
      setVideoUrl('');
      setLoadError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setLoadError(null);
    return () => {
      URL.revokeObjectURL(url);
      setVideoUrl('');
    };
  }, [file]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!file) return;
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'f': toggleFullscreen(); break;
        case 'm': toggleMute(); break;
        case 'arrowright': seek(10); break;
        case 'arrowleft': seek(-10); break;
      }
      resetControlsTimeout();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isPlaying, isMuted, isFullscreen]);

  const togglePlay = () => {
    if (!videoRef.current || loadError) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const seek = (amount: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!file) return null;

  return (
    <div 
      ref={playerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-in fade-in duration-500 overflow-hidden font-sans"
      onMouseMove={resetControlsTimeout}
    >
      <div className="absolute inset-0 z-0 bg-slate-950/95 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full h-full max-w-[1920px] max-h-screen flex items-center justify-center bg-black">
        {videoUrl && !loadError && (
          <video 
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            onError={() => {
              if (videoUrl) {
                setLoadError({
                  title: "Format Conflict",
                  msg: "This specific file format is not natively supported by the browser's engine. Try converting to MP4/H.264 for full compatibility."
                });
              }
            }}
            playsInline
          />
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 p-12 text-center">
            <div className="max-w-xl">
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[32px] flex items-center justify-center mx-auto mb-10 border border-red-500/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-white text-3xl font-black mb-6 uppercase tracking-tight">{loadError.title}</h3>
              <p className="text-slate-400 text-sm mb-12 leading-relaxed">{loadError.msg}</p>
              <button onClick={onClose} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-500 transition-all shadow-xl active:scale-95">Close Player</button>
            </div>
          </div>
        )}

        <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-700 bg-gradient-to-t from-black via-transparent to-black/60 ${showControls && !loadError ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute top-0 left-0 right-0 p-10 flex justify-between items-start">
             <div className="flex flex-col gap-2">
                <span className="text-white font-black text-2xl tracking-tight drop-shadow-2xl truncate max-w-2xl">{file.name}</span>
                <div className="flex gap-2">
                   <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">SaaS Cloud Player</span>
                   <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] bg-white/5 px-3 py-1 rounded-full border border-white/10">{file.name.split('.').pop()}</span>
                </div>
             </div>
             <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-3xl transition-all active:scale-90 border border-white/10">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          <div className="p-10 md:p-14 w-full max-w-[1400px] mx-auto space-y-8">
            <div className="group relative w-full h-2.5 flex items-center cursor-pointer">
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeekChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,1)]" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
              </div>
              <div className="absolute w-6 h-6 bg-white rounded-full shadow-2xl transition-transform group-hover:scale-125 pointer-events-none z-20 border-[6px] border-indigo-600" style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 12px)` }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-12">
                <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-all transform active:scale-90">
                  {isPlaying ? <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
                <div className="flex items-center gap-6 group/volume">
                  <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors">
                    {isMuted || volume === 0 ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-32 accent-indigo-500 opacity-0 group-hover/volume:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="text-white/95 font-mono text-xl tracking-tighter">
                  <span className="font-black">{formatDuration(currentTime)}</span>
                  <span className="mx-3 opacity-20">/</span>
                  <span className="opacity-40">{formatDuration(duration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button onClick={() => {
                  const rates = [1, 1.25, 1.5, 2, 0.5];
                  const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                  setPlaybackRate(next);
                  if (videoRef.current) videoRef.current.playbackRate = next;
                }} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-[11px] font-black tracking-[0.2em] transition-all">
                  {playbackRate === 1 ? 'NORMAL' : `${playbackRate}x`}
                </button>
                <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors">
                  {isFullscreen ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FileItem: React.FC<{ 
  item: VideoMetadata; 
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ item, onPlay, onRemove }) => {
  const extension = item.name.split('.').pop()?.toUpperCase() || 'VID';
  
  return (
    <div className={`px-8 py-6 border-b border-slate-50 transition-all animate-in fade-in slide-in-from-left-4 ${
      item.status === 'processing' ? 'bg-indigo-50/40' : 'bg-white'
    } hover:bg-indigo-50/10 group`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6 overflow-hidden pr-4">
          <button 
            onClick={() => onPlay(item.id)}
            className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 hover:scale-105 transition-all shadow-xl active:scale-90 shrink-0"
          >
            <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>

          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="flex items-center gap-3">
               <span className="text-sm font-black text-slate-900 truncate max-w-[200px] md:max-w-xs" title={item.name}>{item.name}</span>
               <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-400 rounded-md tracking-widest">{extension}</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-slate-400 font-bold font-mono tracking-tighter">{formatFileSize(item.size)}</span>
               <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${
                 item.status === 'error' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                 item.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                 item.status === 'processing' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                 'bg-slate-50 text-slate-400 border-slate-100'
               }`}>
                 {item.status === 'error' ? 'Limited' : item.status === 'completed' ? 'Verified' : item.status === 'processing' ? 'Scanning' : 'Waiting'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            {item.status === 'completed' ? (
              <span className="font-mono font-black text-slate-900 text-xl leading-none tracking-tighter">
                {formatDuration(item.duration)}
              </span>
            ) : item.status === 'processing' ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active</span>
              </div>
            ) : null}
          </div>
          <button onClick={() => onRemove(item.id)} className="w-9 h-9 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [videoList, setVideoList] = useState<VideoMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.SUM);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const addFilesToList = useCallback((files: File[]) => {
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

  const removeFile = (id: string) => {
    setVideoList(prev => prev.filter(v => v.id !== id));
    const newMap = new Map(fileMap);
    newMap.delete(id);
    setFileMap(newMap);
  };

  const startCalculation = async () => {
    if (isProcessing || videoList.length === 0) return;
    const pendingItems = videoList.filter(v => v.status === 'pending' || v.status === 'error');
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    for (const item of pendingItems) {
      const file = fileMap.get(item.id);
      if (!file) continue;
      setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, status: 'processing' } : v));
      try {
        const result = await getVideoDuration(file, (step) => {
          setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, step } : v));
        });
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, duration: result.duration, status: 'completed' } : v));
      } catch (err: any) {
        setVideoList(prev => prev.map(v => v.id === item.id ? { ...v, status: 'error' } : v));
      }
    }
    setIsProcessing(false);
  };

  const exportCSV = () => {
    const rows = [
      ["File Name", "Size", "Duration (Formatted)", "Duration (Seconds)"],
      ...videoList.map(v => [v.name, formatFileSize(v.size), formatDuration(v.duration), v.duration])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "video_durations_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalTime = useMemo(() => {
    const valid = videoList.filter(v => v.status === 'completed').map(v => v.duration);
    if (valid.length === 0) return 0;
    if (mode === CalculationMode.SUM) return valid.reduce((a, b) => a + b, 0);
    if (mode === CalculationMode.AVERAGE) return valid.reduce((a, b) => a + b, 0) / valid.length;
    if (mode === CalculationMode.MAX) return Math.max(...valid);
    return Math.min(...valid);
  }, [videoList, mode]);

  const pendingCount = videoList.filter(v => v.status === 'pending' || v.status === 'error').length;
  const playingFile = playingVideoId ? fileMap.get(playingVideoId) : undefined;

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDragging ? 'bg-indigo-50' : 'bg-slate-50'} text-slate-900 font-sans`}>
      <header className="bg-white/90 backdrop-blur-3xl border-b border-slate-100 p-8 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl transition-all hover:rotate-6">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div><h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">UltraCalc SaaS</h1><p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-2">Zero-Server Metadata Engine</p></div>
        </div>
        <div className="flex items-center gap-10">
          <button onClick={exportCSV} disabled={videoList.length === 0} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-20 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export CSV
          </button>
          <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
          <div className="text-right">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Queue Health</p>
             <p className="text-2xl font-mono font-black text-slate-900 leading-none">{videoList.filter(v => v.status === 'completed').length} <span className="text-slate-200">/</span> {videoList.length}</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-12">
          <section className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10">Cloud Ingestion</h2>
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} 
              onDragLeave={() => setIsDragging(false)} 
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) addFilesToList(Array.from(e.dataTransfer.files)); }}
              className={`w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[44px] py-28 cursor-pointer transition-all flex flex-col items-center gap-8 group ${isDragging ? 'bg-indigo-50 border-indigo-400' : 'hover:bg-slate-100'}`}
            >
              <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center shadow-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></div>
              <div className="text-center"><span className="text-xl font-black uppercase text-slate-900 block tracking-tight">Select Files</span><span className="text-[11px] text-slate-400 font-black uppercase mt-3 tracking-widest">Client-Side Gated</span></div>
              <input type="file" multiple accept="video/*" onChange={(e) => { if (e.target.files) addFilesToList(Array.from(e.target.files)); e.target.value = ''; }} className="hidden" />
            </label>
            <div className="mt-12"><button disabled={isProcessing || pendingCount === 0} onClick={startCalculation} className="w-full bg-slate-900 text-white py-7 rounded-[32px] font-black text-sm uppercase tracking-[0.3em] transition-all hover:bg-indigo-600 active:scale-95 disabled:opacity-20 shadow-2xl flex items-center justify-center gap-5">{isProcessing && <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />}{isProcessing ? 'CALCULATING...' : `START BATCH SCAN (${pendingCount})`}</button></div>
          </section>

          <div className="bg-indigo-600 rounded-[48px] p-12 text-white shadow-2xl relative border border-white/10 overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-10 -mt-10"></div>
             <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-10">SaaS Compliance</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-6"><span className="text-[11px] font-bold text-white/60 uppercase">Data Location</span><span className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-xl">LOCAL_DEVICE</span></div>
                <div className="flex items-center justify-between border-b border-white/10 pb-6"><span className="text-[11px] font-bold text-white/60 uppercase">Storage Limit</span><span className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-xl">UNLIMITED (FREE)</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-white/60 uppercase">Cloud Sync</span><span className="text-[10px] font-black bg-green-400 text-green-900 px-3 py-1.5 rounded-xl">READY_FOR_VERCEL</span></div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-12">
          <div className="bg-white rounded-[64px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col flex-1">
            <div className="px-14 py-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
               <div className="flex gap-4 p-2.5 bg-slate-200/40 rounded-[24px]">
                {['SUM', 'AVERAGE', 'MAX', 'MIN'].map(m => (
                  <button key={m} onClick={() => setMode(m as CalculationMode)} className={`px-10 py-4 rounded-[18px] text-[10px] font-black uppercase transition-all tracking-widest ${mode === m ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>{m === 'SUM' ? 'Total Addition' : m}</button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[600px] min-h-[450px] custom-scrollbar">
              {videoList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-48 opacity-20 grayscale">
                  <div className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center mb-10 shadow-inner border border-slate-100"><svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
                  <p className="text-sm font-black uppercase tracking-[1em]">Empty Registry</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {videoList.map(v => <FileItem key={v.id} item={v} onPlay={(id) => setPlayingVideoId(id)} onRemove={removeFile} />)}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-24 text-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-3 bg-white/5 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_40px_rgba(99,102,241,1)]" style={{ width: `${(videoList.filter(v => v.status === 'completed').length / (videoList.length || 1)) * 100}%` }} /></div>
               <p className="text-slate-500 text-[12px] font-black uppercase tracking-[1em] mb-10">Calculated Batch Matrix</p>
               <div className="text-[14rem] font-mono font-black text-white tracking-tighter leading-none transition-all duration-1000 group-hover:scale-110 group-hover:text-indigo-400 select-all">{formatDuration(totalTime)}</div>
               <div className="mt-24 flex justify-center gap-40 border-t border-white/5 pt-24">
                  <div className="text-left border-l-8 border-indigo-600 pl-10"><p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-3">Calculated</p><p className="text-6xl font-mono font-black text-white tracking-tighter tabular-nums">{videoList.filter(v => v.status === 'completed').length}</p></div>
                  <div className="text-left border-l-8 border-slate-800 pl-10"><p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-3">Total Volume</p><p className="text-6xl font-mono font-black text-slate-800 tracking-tighter tabular-nums">{videoList.length}</p></div>
               </div>
            </div>
          </div>
        </div>
      </main>

      <AdvancedPlayer file={playingFile} onClose={() => setPlayingVideoId(null)} />
    </div>
  );
};

export default App;
