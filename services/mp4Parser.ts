
/**
 * Professional MP4 Box-Traversal Engine (v3.2 - Low Memory Edition)
 * Traversing nested atoms with granular byte-range reads to minimize RAM footprint.
 */
export const getMp4DurationInstantly = async (file: File): Promise<number> => {
  const readAt = (offset: number, size: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file.slice(offset, offset + size));
    });
  };

  let offset = 0;
  const fileSize = file.size;
  const MAX_BOX_ATTEMPTS = 100;
  let attempts = 0;

  while (offset < fileSize && attempts < MAX_BOX_ATTEMPTS) {
    attempts++;
    const headerBuffer = await readAt(offset, 8);
    if (headerBuffer.byteLength < 8) break;

    const view = new DataView(headerBuffer);
    let boxSize = view.getUint32(0);
    const boxType = String.fromCharCode(
      view.getUint8(4), view.getUint8(5),
      view.getUint8(6), view.getUint8(7)
    );

    let headerSize = 8;
    if (boxSize === 1) {
      const largeSizeBuffer = await readAt(offset + 8, 8);
      if (largeSizeBuffer.byteLength < 8) break;
      const largeView = new DataView(largeSizeBuffer);
      boxSize = Number(largeView.getBigUint64(0));
      headerSize = 16;
    }

    if (boxType === 'moov') {
      // Step into moov box without reading it all at once
      let subOffset = offset + headerSize;
      const moovEnd = offset + boxSize;
      let subAttempts = 0;

      while (subOffset < moovEnd && subAttempts < 50) {
        subAttempts++;
        const subHeader = await readAt(subOffset, 8);
        if (subHeader.byteLength < 8) break;
        
        const subView = new DataView(subHeader);
        const subSize = subView.getUint32(0);
        const subType = String.fromCharCode(
          subView.getUint8(4), subView.getUint8(5),
          subView.getUint8(6), subView.getUint8(7)
        );

        if (subType === 'mvhd') {
          // mvhd is usually small (around 100 bytes)
          const mvhdContent = await readAt(subOffset + 8, Math.min(subSize, 128));
          const mvhdView = new DataView(mvhdContent);
          const version = mvhdView.getUint8(0);
          const tsOffset = version === 1 ? 20 : 12; // Adjusted offset for version 1 (64-bit) vs 0 (32-bit)
          
          // Timescale and duration positions relative to content start (after 8 byte header)
          // version (1) + flags (3) + creation (4/8) + modification (4/8) = 12 or 20 bytes
          const timescale = mvhdView.getUint32(tsOffset);
          const duration = version === 1 ? 
            Number(mvhdView.getBigUint64(tsOffset + 4)) : 
            mvhdView.getUint32(tsOffset + 4);
          
          if (timescale > 0) return duration / timescale;
        }

        if (subSize <= 0) break;
        subOffset += subSize;
      }
      break; 
    }

    if (boxSize === 0) break; // Box goes to end of file
    offset += boxSize;
  }

  throw new Error("Metadata scan incomplete");
};
