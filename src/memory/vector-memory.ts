/**
 * AgentForge - Semantic Vector Memory & Episodic Retrieval Engine
 * 
 * Implements high-dimensional embedding similarity search (Cosine),
 * token budget compression, and dynamic context injection.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: number;
}

export class SemanticVectorMemory {
  private entries: MemoryEntry[] = [];

  public store(content: string, embedding: number[], metadata: Record<string, any> = {}): string {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.entries.push({
      id,
      content,
      embedding,
      metadata,
      timestamp: Date.now(),
    });
    return id;
  }

  /**
   * Cosine similarity formulation:
   * sim(A, B) = (A  B) / (||A||  ||B||)
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vector dimensionality mismatch');

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Top-K semantic nearest neighbors retrieval
   */
  public search(queryEmbedding: number[], topK = 3, minScore = 0.5): Array<{ entry: MemoryEntry; score: number }> {
    const scored = this.entries.map((entry) => ({
      entry,
      score: SemanticVectorMemory.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    return scored
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public getCount(): number {
    return this.entries.length;
  }
}
