
/**
 * Advanced Binary MP4 Parser (v3 - Precision Focus)
 * Locates the specific media duration (mdhd) of the video track.
 * This is more accurate than the global 'mvhd' header.
 */
export const getMp4DurationInstantly = async (file: File): Promise<number> => {
  const fileSize = file.size;
  
  const readChunk = (offset: number, size: number): Promise<DataView> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new DataView(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file.slice(offset, offset + size));
    });
  };

  const parseBoxes = (view: DataView, startOffset: number, endOffset: number): { duration: number, timescale: number } | null => {
    let offset = startOffset;
    let movieDuration = -1;
    let movieTimescale = -1;

    while (offset < endOffset - 8) {
      const boxSize = view.getUint32(offset);
      const boxType = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7)
      );

      if (boxSize <= 0) break;

      // Drill into containers to find the specific media headers
      if (['moov', 'trak', 'mdia'].includes(boxType)) {
        const result = parseBoxes(view, offset + 8, Math.min(offset + boxSize, endOffset));
        if (result) return result;
      }

      // mdhd (Media Header) is the most accurate source for actual media duration
      if (boxType === 'mdhd') {
        const version = view.getUint8(offset + 8);
        const tsOffset = version === 1 ? 20 : 12;
        const timescale = view.getUint32(offset + 8 + tsOffset);
        let duration = 0;
        if (version === 1) {
          duration = Number(view.getBigUint64(offset + 8 + tsOffset + 4));
        } else {
          duration = view.getUint32(offset + 8 + tsOffset + 4);
        }
        if (timescale > 0 && duration > 0) return { duration, timescale };
      }
      
      // Keep mvhd as a backup if mdhd is missing or buried too deep
      if (boxType === 'mvhd' && movieDuration === -1) {
        const version = view.getUint8(offset + 8);
        const tsOffset = version === 1 ? 20 : 12;
        movieTimescale = view.getUint32(offset + 8 + tsOffset);
        if (version === 1) {
          movieDuration = Number(view.getBigUint64(offset + 8 + tsOffset + 4));
        } else {
          movieDuration = view.getUint32(offset + 8 + tsOffset + 4);
        }
      }

      offset += boxSize;
    }

    if (movieDuration !== -1 && movieTimescale !== -1) {
      return { duration: movieDuration, timescale: movieTimescale };
    }
    return null;
  };

  try {
    // 1. Check start of file (standard moov location)
    const startView = await readChunk(0, Math.min(fileSize, 262144));
    const result = parseBoxes(startView, 0, startView.byteLength);
    if (result) return result.duration / result.timescale;

    // 2. Check end of file (common in mobile/fast-start recordings)
    const endSize = Math.min(fileSize, 524288);
    const endView = await readChunk(fileSize - endSize, endSize);
    const endResult = parseBoxes(endView, 0, endView.byteLength);
    if (endResult) return endResult.duration / endResult.timescale;

  } catch (e) {
    console.warn("Binary precision parse failed, falling back to browser.");
  }

  throw new Error("Duration header not found");
};
