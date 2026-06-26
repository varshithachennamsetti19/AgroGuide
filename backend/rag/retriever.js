import { loadDocuments } from './documentLoader.js';
import { chunkDocuments } from './chunker.js';
import { getEmbedding } from './embeddingService.js';
import { VectorStore } from './vectorStore.js';

const vectorStore = new VectorStore();
let useKeywordFallback = false;
let plainChunks = [];

/**
 * Re-indexes all local crop and scheme documents to generate fresh embeddings.
 * Falls back to keyword search if the Google Embeddings API is offline or unsupported.
 */
export async function initializeRetriever(forceReindex = false) {
  // Load plain chunks into memory for keyword search fallback
  try {
    const docs = loadDocuments();
    plainChunks = chunkDocuments(docs);
  } catch (err) {
    console.error("Retriever: Failed to load documents for keyword fallback:", err);
  }

  if (vectorStore.vectors.length > 0 && !forceReindex) {
    console.log("📡 Retriever: Vector store already initialized with existing embeddings.");
    return;
  }

  console.log("🔄 Retriever: Rebuilding embeddings...");
  try {
    vectorStore.clear();

    for (const chunk of plainChunks) {
      console.log(`🧮 Generating embedding for chunk from: ${chunk.metadata.title}`);
      try {
        const embedding = await getEmbedding(chunk.text);
        vectorStore.addVector(chunk.text, chunk.metadata, embedding);
      } catch (embErr) {
        console.warn(`VectorStore: Failed to get embedding for chunk. Enabling keyword search fallback.`);
        useKeywordFallback = true;
        break; // Stop calling the failing API
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (!useKeywordFallback) {
      vectorStore.saveStore();
      console.log("✅ Retriever: Indexing completed successfully.");
    }
  } catch (error) {
    console.error("❌ Retriever initialization failed:", error);
    useKeywordFallback = true;
  }
}

/**
 * Perform a keyword-based similarity search (fallback).
 */
function keywordSearch(queryText, topK = 3) {
  const queryTokens = queryText.toLowerCase().split(/\W+/).filter(token => token.length > 2);
  if (queryTokens.length === 0) {
    // If query is short, return any chunk that matches basic terms
    return plainChunks.slice(0, topK).map(chunk => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: 1.0
    }));
  }

  const scored = plainChunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;
    
    queryTokens.forEach(token => {
      // Score based on word presence and exact matches
      const regex = new RegExp(`\\b${token}\\b`, 'g');
      const matches = textLower.match(regex);
      if (matches) {
        score += matches.length * 2.0; // exact word match gets high weight
      } else if (textLower.includes(token)) {
        score += 0.5; // partial substring match gets lower weight
      }
    });

    // Boost if title matches a query token
    const titleLower = (chunk.metadata.title || "").toLowerCase();
    queryTokens.forEach(token => {
      if (titleLower.includes(token)) {
        score += 5.0; // high boost for title matching query
      }
    });

    return {
      text: chunk.text,
      metadata: chunk.metadata,
      score
    };
  });

  // Sort and filter results
  const results = scored.filter(item => item.score > 0);
  results.sort((a, b) => b.score - a.score);
  
  if (results.length === 0) {
    // Return first few chunks if no matches found so LLM still gets general context
    return plainChunks.slice(0, topK).map(chunk => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: 0.1
    }));
  }

  return results.slice(0, topK);
}

/**
 * Retrieve the top K relevant chunks for a user query.
 * @param {string} queryText - User's query
 * @param {number} topK - Maximum number of chunks to return
 * @returns {Promise<Array<Object>>} Matching chunks with metadata and similarity score
 */
export async function retrieve(queryText, topK = 3) {
  if (useKeywordFallback || vectorStore.vectors.length === 0) {
    console.log(`🔍 Retriever: Using local keyword fallback search for: "${queryText}"`);
    return keywordSearch(queryText, topK);
  }

  try {
    const queryEmbedding = await getEmbedding(queryText);
    return vectorStore.similaritySearch(queryEmbedding, topK);
  } catch (error) {
    console.warn("Retrieval embedding failed. Falling back to keyword search:", error.message);
    return keywordSearch(queryText, topK);
  }
}
