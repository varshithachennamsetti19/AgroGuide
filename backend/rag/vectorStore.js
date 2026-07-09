import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'agroguide';

/**
 * Calculates the cosine similarity between two numerical vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorStore {
  constructor() {
    this.storePath = path.resolve('data/embeddings.json');
    this.vectors = [];
    this.isQdrantAvailable = false;
    this.readyPromise = this.initializeQdrantCollection();
  }

  async initializeQdrantCollection() {
    try {
      // Health check ping to Qdrant
      await axios.get(`${QDRANT_URL}/health`, { timeout: 2000 });
      this.isQdrantAvailable = true;
      console.log(`📡 VectorStore: Connected to Qdrant server at ${QDRANT_URL}`);

      // Check if collection exists
      try {
        await axios.get(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
        console.log(`📡 VectorStore: Qdrant collection "${COLLECTION_NAME}" is ready.`);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log(`📡 VectorStore: Creating collection "${COLLECTION_NAME}" in Qdrant...`);
          await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
            vectors: {
              size: 768, // Gemini embedding-001 dimension
              distance: 'Cosine'
            }
          });
          console.log(`📡 VectorStore: Qdrant collection created.`);
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.warn(`⚠️ VectorStore: Qdrant unreachable. Falling back to local memory JSON database. Reason: ${error.message}`);
      this.isQdrantAvailable = false;
      this.loadLocalStore();
    }
  }

  loadLocalStore() {
    try {
      if (fs.existsSync(this.storePath)) {
        this.vectors = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
        console.log(`📡 VectorStore: Loaded ${this.vectors.length} local fallback embeddings.`);
      }
    } catch (error) {
      console.error("VectorStore load error:", error);
    }
  }

  async saveStore() {
    await this.readyPromise;
    if (this.isQdrantAvailable) {
      // Qdrant writes persistently on upsert, so no saveStore step is needed.
      return;
    }

    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.vectors, null, 2), 'utf8');
      console.log(`💾 VectorStore: Saved ${this.vectors.length} local embeddings.`);
    } catch (error) {
      console.error("VectorStore save error:", error);
    }
  }

  async addVector(text, metadata, embedding) {
    await this.readyPromise;
    if (this.isQdrantAvailable) {
      try {
        const pointId = crypto.randomUUID();
        await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
          points: [
            {
              id: pointId,
              vector: embedding,
              payload: { text, metadata }
            }
          ]
        });
      } catch (err) {
        console.error("Qdrant point insert failed:", err.message);
        // Backup in memory
        this.vectors.push({ text, metadata, embedding });
      }
    } else {
      this.vectors.push({ text, metadata, embedding });
    }
  }

  async clear() {
    await this.readyPromise;
    this.vectors = [];
    if (this.isQdrantAvailable) {
      try {
        console.log(`📡 VectorStore: Recreating Qdrant collection to clear points.`);
        await axios.delete(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
        await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
          vectors: {
            size: 768,
            distance: 'Cosine'
          }
        });
      } catch (err) {
        console.error("Qdrant collection clear failed:", err.message);
      }
    }
  }

  async similaritySearch(queryEmbedding, topK = 3) {
    await this.readyPromise;
    if (this.isQdrantAvailable) {
      try {
        const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
          vector: queryEmbedding,
          limit: topK,
          with_payload: true
        });

        return response.data.result.map(point => ({
          text: point.payload.text,
          metadata: point.payload.metadata,
          score: point.score
        }));
      } catch (err) {
        console.error("Qdrant similarity search failed. Falling back to local search:", err.message);
      }
    }

    // Local search fallback
    if (!queryEmbedding || this.vectors.length === 0) return [];

    const results = this.vectors.map((item) => {
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        text: item.text,
        metadata: item.metadata,
        score
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
