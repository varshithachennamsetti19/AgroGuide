import axios from 'axios';
import { loadDocuments } from './documentLoader.js';
import { chunkDocuments } from './chunker.js';
import { getEmbedding } from './embeddingService.js';
import { VectorStore } from './vectorStore.js';

const vectorStore = new VectorStore();
let useKeywordFallback = false;
let plainChunks = [];
let bm25Instance = null;

/**
 * Lightweight BM25 implementation for Sparse Search (Phase 11)
 */
class BM25 {
  constructor(corpus = []) {
    this.corpus = corpus; // Array of { text, metadata }
    this.k1 = 1.5;
    this.b = 0.75;
    this.N = corpus.length;
    this.docLengths = corpus.map(doc => doc.text.split(/\s+/).length);
    this.avgdl = this.N > 0 ? (this.docLengths.reduce((a, b) => a + b, 0) / this.N) : 1;
    
    // Compute Document Frequency (DF) for term TF-IDF weights
    this.df = {};
    corpus.forEach(doc => {
      const words = new Set(this.tokenize(doc.text));
      words.forEach(w => {
        this.df[w] = (this.df[w] || 0) + 1;
      });
    });
  }

  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  }

  getIDF(word) {
    const df = this.df[word] || 0;
    return Math.log((this.N - df + 0.5) / (df + 0.5) + 1);
  }

  search(query, topK = 5) {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0 || this.N === 0) return [];

    const scores = this.corpus.map((doc, idx) => {
      const docWords = this.tokenize(doc.text);
      const tf = {};
      docWords.forEach(w => {
        tf[w] = (tf[w] || 0) + 1;
      });

      const dl = this.docLengths[idx];
      let score = 0;

      queryTerms.forEach(term => {
        const termTF = tf[term] || 0;
        if (termTF > 0) {
          const idf = this.getIDF(term);
          const numerator = termTF * (this.k1 + 1);
          const denominator = termTF + this.k1 * (1 - this.b + this.b * (dl / this.avgdl));
          score += idf * (numerator / denominator);
        }
      });

      return { doc, score };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => ({
        text: item.doc.text,
        metadata: item.doc.metadata,
        score: item.score
      }));
  }
}

/**
 * Re-indexes all local crop and scheme documents to generate fresh embeddings.
 * Sets up the BM25 search indices.
 */
export async function initializeRetriever(forceReindex = false) {
  // Load plain chunks into memory
  try {
    const docs = loadDocuments();
    plainChunks = chunkDocuments(docs);
    bm25Instance = new BM25(plainChunks);
    console.log(`📡 Retriever: Initialized BM25 search index with ${plainChunks.length} documents.`);
  } catch (err) {
    console.error("Retriever: Failed to load documents for keyword fallback:", err);
  }

  await vectorStore.readyPromise;

  if (vectorStore.vectors.length > 0 && !forceReindex) {
    console.log("📡 Retriever: Vector store already initialized with existing embeddings.");
    return;
  }

  // If using Qdrant and it already has collections/points populated, skip reindexing
  if (vectorStore.isQdrantAvailable && !forceReindex) {
    try {
      const url = `${process.env.QDRANT_URL || 'http://localhost:6333'}/collections/agroguide`;
      const res = await axios.get(url);
      if (res.data.result.points_count > 0) {
        console.log(`📡 Retriever: Qdrant collection already has ${res.data.result.points_count} points. Skipping reindex.`);
        return;
      }
    } catch (err) {
      // Continue to reindex
    }
  }

  console.log("🔄 Retriever: Rebuilding embeddings in vector store...");
  try {
    await vectorStore.clear();

    for (const chunk of plainChunks) {
      console.log(`🧮 Generating embedding for chunk from: ${chunk.metadata.title}`);
      try {
        const embedding = await getEmbedding(chunk.text);
        await vectorStore.addVector(chunk.text, chunk.metadata, embedding);
      } catch (embErr) {
        console.warn(`VectorStore: Failed to get embedding for chunk. Enabling keyword search fallback.`);
        useKeywordFallback = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (!useKeywordFallback) {
      await vectorStore.saveStore();
      console.log("✅ Retriever: Indexing completed successfully.");
    }
  } catch (error) {
    console.error("❌ Retriever initialization failed:", error);
    useKeywordFallback = true;
  }
}

/**
 * Reciprocal Rank Fusion (RRF) - combines Dense and Sparse retrieval ranks
 */
function reciprocalRankFusion(denseResults, sparseResults, topK) {
  const rrfScores = new Map();
  const k = 60; // Standard constant for RRF

  const addScores = (results) => {
    results.forEach((item, index) => {
      const key = item.text;
      const rank = index + 1;
      const rrfValue = 1.0 / (k + rank);
      
      if (rrfScores.has(key)) {
        const current = rrfScores.get(key);
        current.score += rrfValue;
      } else {
        rrfScores.set(key, {
          text: item.text,
          metadata: item.metadata,
          score: rrfValue
        });
      }
    });
  };

  addScores(denseResults);
  addScores(sparseResults);

  const merged = Array.from(rrfScores.values());
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, topK);
}

/**
 * Metadata Filtering: Boosts scores of items matching the user's primary crop
 */
function applyMetadataFilter(results, primaryCrop) {
  if (!primaryCrop) return results;
  const cropLower = primaryCrop.toLowerCase();
  
  return results.map(item => {
    const textLower = item.text.toLowerCase();
    const titleLower = (item.metadata?.title || '').toLowerCase();
    const tagsLower = ((item.metadata?.tags || []).join(' ')).toLowerCase();
    
    let score = item.score;
    // Boost relevance score if crop tag is present
    if (textLower.includes(cropLower) || titleLower.includes(cropLower) || tagsLower.includes(cropLower)) {
      score += 0.2; // relevancy metadata boost
    }
    return { ...item, score };
  });
}

/**
 * Cross-Encoder Reranking: Calls FastAPI vision-service `/rerank` endpoint
 */
async function crossEncoderRerank(queryText, candidates) {
  if (candidates.length === 0) return candidates;
  
  const documents = candidates.map(c => c.text);
  const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8000/analyze';
  const rerankUrl = VISION_SERVICE_URL.replace('/analyze', '/rerank');

  try {
    const response = await axios.post(rerankUrl, {
      query: queryText,
      documents: documents
    }, { timeout: 4000 });

    const scores = response.data.scores;
    const reranked = candidates.map((c, idx) => ({
      ...c,
      crossScore: scores[idx] !== undefined ? scores[idx] : 0.0
    }));

    // Sort by cross encoder score
    reranked.sort((a, b) => b.crossScore - a.crossScore);
    return reranked.map(item => ({
      text: item.text,
      metadata: item.metadata,
      score: item.crossScore // Replace internal score with reranked score
    }));
  } catch (error) {
    console.warn(`[Retriever] Cross-Encoder reranking offline. Returning RRF ranks. Reason: ${error.message}`);
    // If reranker fails, preserve the RRF rank order
    return candidates;
  }
}

/**
 * Performs local keyword fallback search when embeddings APIs are down.
 */
function keywordSearchFallback(queryText, topK = 3) {
  if (!bm25Instance) return [];
  return bm25Instance.search(queryText, topK);
}

/**
 * Retrieve the top K relevant chunks using Hybrid Search (Dense + Sparse RRF)
 * with Metadata Filtering and Cross-Encoder Re-ranking.
 * @param {string} queryText - User's query
 * @param {number} topK - Maximum number of chunks to return
 * @param {string} primaryCrop - The user's primary crop for metadata boosting/filtering
 * @returns {Promise<Array<Object>>} Matching chunks with metadata and similarity score
 */
export async function retrieve(queryText, topK = 3, primaryCrop = null) {
  if (useKeywordFallback || plainChunks.length === 0) {
    console.log(`🔍 Retriever: Using local BM25 keyword search fallback for: "${queryText}"`);
    const results = keywordSearchFallback(queryText, topK);
    return applyMetadataFilter(results, primaryCrop);
  }

  try {
    // 1. Dense retrieval (Qdrant or local vector store)
    const queryEmbedding = await getEmbedding(queryText);
    const denseCandidates = await vectorStore.similaritySearch(queryEmbedding, topK * 4);

    // 2. Sparse retrieval (BM25)
    let sparseCandidates = [];
    if (bm25Instance) {
      sparseCandidates = bm25Instance.search(queryText, topK * 4);
    }

    // 3. Reciprocal Rank Fusion (RRF)
    const fusedCandidates = reciprocalRankFusion(denseCandidates, sparseCandidates, topK * 3);

    // 4. Metadata Filtering & Boosting
    const filteredCandidates = applyMetadataFilter(fusedCandidates, primaryCrop);

    // 5. Cross-Encoder Re-ranking
    console.log(`[RAG] Re-ranking ${filteredCandidates.length} hybrid candidates...`);
    const rerankedCandidates = await crossEncoderRerank(queryText, filteredCandidates);

    return rerankedCandidates.slice(0, topK);
  } catch (error) {
    console.warn("RAG retrieval failed. Falling back to simple BM25 search:", error.message);
    const results = keywordSearchFallback(queryText, topK);
    return applyMetadataFilter(results, primaryCrop);
  }
}
