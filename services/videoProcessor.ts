
import { getMp4DurationInstantly } from './mp4Parser.ts';

export const getVideoDuration = async (
  source: File | string, 
  onStep: (step: string) => void
): Promise<{ duration: number; blob?: Blob }> => {
  
  if (source instanceof File) {
    onStep("BINARY SCAN...");
    try {
      const duration = await getMp4DurationInstantly(source);
      if (duration > 0) return { duration };
    } catch (e) {
      onStep("PROBING CODEC...");
    }
  }

  return new Promise(async (resolve, reject) => {
    let url: string = '';
    let blob: Blob | undefined;
    let isSettled = false; // Prevent multiple resolutions/rejections

    if (typeof source === 'string') {
      try {
        const response = await fetch(source);
        blob = await response.blob();
        url = URL.createObjectURL(blob);
      } catch (err) {
        return reject(new Error("Network Error"));
      }
    } else {
      url = URL.createObjectURL(source);
    }

    const video = document.createElement('video');
    video.style.display = 'none';
    video.preload = 'metadata';
    video.muted = true;
    
    const safeReject = (err: Error) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(err);
    };

    const safeResolve = (data: { duration: number; blob?: Blob }) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(data);
    };

    // Memory safeguard
    const timeout = setTimeout(() => {
      safeReject(new Error("Probe Timeout"));
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.pause();
      // Using removeAttribute prevents "no supported source" console noise
      video.removeAttribute('src'); 
      video.load();   
      if (url) URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const d = video.duration;
      if (d && !isNaN(d) && d !== Infinity) {
        safeResolve({ duration: d, blob });
      } else {
        safeReject(new Error("Invalid Duration"));
      }
    };

    video.onerror = () => {
      // Browsers often fire error when src is cleared; we ignore if already settled
      if (!isSettled) {
        safeReject(new Error("Codec Incompatible"));
      }
    };

    video.src = url;
  });
};
