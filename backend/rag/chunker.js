/**
 * Splits document texts into chunks of a given size with overlapping sentences/characters.
 * @param {Array<Object>} documents - List of documents { text, metadata }
 * @param {number} chunkSize - Target character length per chunk
 * @param {number} chunkOverlap - Overlap length in characters
 * @returns {Array<Object>} List of chunk objects { text, metadata }
 */
export function chunkDocuments(documents, chunkSize = 400, chunkOverlap = 50) {
  const chunks = [];

  documents.forEach((doc) => {
    const text = doc.text;
    const metadata = doc.metadata;

    // If document is small enough, keep it in one chunk
    if (text.length <= chunkSize) {
      chunks.push({
        text,
        metadata
      });
      return;
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end);
      
      chunks.push({
        text: chunkText,
        metadata
      });

      start += (chunkSize - chunkOverlap);
      
      // Prevent infinite loops if step size is too small or zero
      if (chunkSize <= chunkOverlap) {
        break;
      }
    }
  });

  return chunks;
}
