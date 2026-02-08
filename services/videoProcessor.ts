
import { getMp4DurationInstantly } from './mp4Parser.ts';

export const getVideoDuration = async (
  source: File | string, 
  onStep: (step: string) => void
): Promise<{ duration: number; blob?: Blob }> => {
  
  // 1. TRY INSTANT BINARY PARSE (Fastest path)
  if (source instanceof File) {
    try {
      const instant = await getMp4DurationInstantly(source);
      if (instant > 0) {
        onStep("INSTANT READ");
        return { duration: instant };
      }
    } catch (e) {
      onStep("VERIFYING...");
    }
  }

  // 2. TRY LOCAL BROWSER ENGINE (Precision path)
  return new Promise(async (resolve, reject) => {
    let url: string = '';
    let blob: Blob | undefined;
    let isSettled = false; 

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
    video.playsInline = true;
    
    const safeResolve = (data: { duration: number; blob?: Blob }) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(data);
    };

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute('src'); 
      video.load();   
      if (url && typeof source !== 'string') URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      // Browser reports container duration here. 
      // To solve the "extra seconds" error, we seek to verify the actual media end.
      if (video.duration > 0 && video.duration !== Infinity) {
        // Seek to the reported end to see if the browser snaps to a more accurate value
        video.currentTime = video.duration;
      } else {
        // Force seek to end for fragmented streams
        video.currentTime = 999999; 
      }
    };

    video.onseeked = () => {
      // Browsers update duration more accurately after a seek to end
      const finalDuration = video.duration !== Infinity ? video.duration : video.currentTime;
      if (finalDuration > 0) {
        safeResolve({ duration: finalDuration, blob });
      }
    };

    video.onerror = () => reject(new Error("Format Error"));
    video.src = url;
    video.load();

    // Safety timeout to prevent infinite processing
    setTimeout(() => {
      if (!isSettled) {
        if (video.duration > 0 && video.duration !== Infinity) {
          safeResolve({ duration: video.duration, blob });
        } else {
          reject(new Error("Timeout"));
        }
      }
    }, 5000);
  });
};
