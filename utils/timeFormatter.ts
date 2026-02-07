
/**
 * Formats seconds into HH:mm:ss string
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hDisplay = h > 0 ? `${h.toString().padStart(2, '0')}:` : '00:';
  const mDisplay = m.toString().padStart(2, '0') + ':';
  const sDisplay = s.toString().padStart(2, '0');
  
  return hDisplay + mDisplay + sDisplay;
};

/**
 * Formats bytes into readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
