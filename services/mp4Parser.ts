
/**
 * Advanced MP4 Metadata Parser
 * Correctly traverses atom structures to find mvhd duration without loading full files.
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
  const MAX_BOX_ATTEMPTS = 50; 
  let attempts = 0;

  try {
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

      // moov box contains the metadata we need
      if (boxType === 'moov') {
        let subOffset = offset + headerSize;
        const moovEnd = offset + boxSize;
        let subAttempts = 0;

        while (subOffset < moovEnd && subAttempts < 100) {
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
            const mvhdContent = await readAt(subOffset + 8, Math.min(subSize, 128));
            const mvhdView = new DataView(mvhdContent);
            const version = mvhdView.getUint8(0);
            
            // Offset for timescale and duration varies based on version (32-bit vs 64-bit)
            // v0: creation(4), modification(4), timescale(4), duration(4) -> starts at offset 12
            // v1: creation(8), modification(8), timescale(4), duration(8) -> starts at offset 20
            const tsOffset = version === 1 ? 20 : 12;
            const timescale = mvhdView.getUint32(tsOffset);
            
            let duration: number;
            if (version === 1) {
              duration = Number(mvhdView.getBigUint64(tsOffset + 4));
            } else {
              duration = mvhdView.getUint32(tsOffset + 4);
            }
            
            if (timescale > 0 && duration > 0) return duration / timescale;
          }

          if (subSize <= 0) break;
          subOffset += subSize;
        }
        break; 
      }

      if (boxSize <= 0) break;
      offset += boxSize;
    }
  } catch (e) {
    console.warn("Binary metadata scan failed, falling back to browser probe.");
  }

  throw new Error("Metadata scan incomplete");
};
