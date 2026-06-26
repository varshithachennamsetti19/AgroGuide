import fs from 'fs';
import path from 'path';

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
    this.loadStore();
  }

  loadStore() {
    try {
      if (fs.existsSync(this.storePath)) {
        this.vectors = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
        console.log(`📡 VectorStore: Loaded ${this.vectors.length} embeddings from ${this.storePath}`);
      }
    } catch (error) {
      console.error("VectorStore load error:", error);
    }
  }

  saveStore() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.vectors, null, 2), 'utf8');
      console.log(`💾 VectorStore: Saved ${this.vectors.length} embeddings to ${this.storePath}`);
    } catch (error) {
      console.error("VectorStore save error:", error);
    }
  }

  addVector(text, metadata, embedding) {
    this.vectors.push({ text, metadata, embedding });
  }

  clear() {
    this.vectors = [];
  }

  similaritySearch(queryEmbedding, topK = 3) {
    if (!queryEmbedding || this.vectors.length === 0) return [];

    const results = this.vectors.map((item) => {
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        text: item.text,
        metadata: item.metadata,
        score
      };
    });

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    // Return the topK matching results
    return results.slice(0, topK);
  }
}
