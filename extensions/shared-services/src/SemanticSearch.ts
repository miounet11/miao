/**
 * Semantic Search Implementation
 * Uses Transformers.js for local embedding generation and vector similarity search
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { SQLiteStorage } from './SQLiteStorage';
import { EmbeddingRecord, SemanticSearchResult } from './DatabaseSchema';
import { randomUUID } from 'crypto';

export interface SemanticSearchOptions {
  model?: string;
  threshold?: number;
  limit?: number;
}

export class SemanticSearch {
  private embedder: FeatureExtractionPipeline | null = null;
  private modelName: string;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    private storage: SQLiteStorage,
    options: SemanticSearchOptions = {}
  ) {
    // Use a lightweight model optimized for semantic similarity
    this.modelName = options.model || 'Xenova/all-MiniLM-L6-v2';
  }

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    if (this.embedder) {
      return;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize();
    await this.initPromise;
    this.isInitializing = false;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log(`Loading embedding model: ${this.modelName}`);
      this.embedder = await pipeline('feature-extraction', this.modelName);
      console.log('Embedding model loaded successfully');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      throw new Error(`Failed to initialize semantic search: ${error}`);
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }

    try {
      // Generate embedding
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true
      });

      // Extract the embedding vector
      const embedding = output.data as Float32Array;
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate and save embedding for a source
   */
  async saveEmbedding(
    sourceType: 'code' | 'chat' | 'doc' | 'context',
    sourceId: string,
    text: string
  ): Promise<string> {
    const vector = await this.generateEmbedding(text);
    const embeddingId = randomUUID();

    const record: EmbeddingRecord = {
      id: embeddingId,
      source_type: sourceType,
      source_id: sourceId,
      vector,
      dimension: vector.length,
      model: this.modelName,
      created_at: Date.now()
    };

    await this.storage.saveEmbedding(record);
    return embeddingId;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Search for similar items by text query
   */
  async searchSimilar<T>(
    query: string,
    sourceType: 'code' | 'chat' | 'doc' | 'context',
    getItemById: (sourceId: string) => Promise<T | null>,
    options: { threshold?: number; limit?: number } = {}
  ): Promise<SemanticSearchResult<T>[]> {
    const threshold = options.threshold ?? 0.5;
    const limit = options.limit ?? 10;

    // Generate query embedding
    const queryVector = await this.generateEmbedding(query);

    // Get all embeddings of the specified type
    // Note: In a production system, you'd want to use a proper vector database
    // For now, we'll do a brute-force search which is acceptable for small datasets
    const allEmbeddings = await this.getAllEmbeddingsByType(sourceType);

    // Calculate similarities
    const similarities: Array<{ sourceId: string; similarity: number }> = [];

    for (const embedding of allEmbeddings) {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);
      if (similarity >= threshold) {
        similarities.push({
          sourceId: embedding.source_id,
          similarity
        });
      }
    }

    // Sort by similarity (descending) and limit
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, limit);

    // Fetch the actual items
    const results: SemanticSearchResult<T>[] = [];
    for (const { sourceId, similarity } of topResults) {
      const item = await getItemById(sourceId);
      if (item) {
        results.push({
          item,
          score: similarity,
          similarity
        });
      }
    }

    return results;
  }

  /**
   * Search for similar code
   */
  async searchSimilarCode(
    query: string,
    projectPath?: string,
    options?: { threshold?: number; limit?: number }
  ): Promise<SemanticSearchResult<any>[]> {
    return this.searchSimilar(
      query,
      'code',
      async (sourceId) => {
        // Get code index record
        const codeRecords = await this.storage.searchCodeIndex(sourceId, projectPath);
        return codeRecords.length > 0 ? codeRecords[0].item : null;
      },
      options
    );
  }

  /**
   * Search for similar chat messages
   */
  async searchSimilarChats(
    query: string,
    projectPath?: string,
    options?: { threshold?: number; limit?: number }
  ): Promise<SemanticSearchResult<any>[]> {
    return this.searchSimilar(
      query,
      'chat',
      async (sourceId) => {
        // Get chat message
        const messages = await this.storage.getChatMessages(sourceId);
        return messages.length > 0 ? messages[0] : null;
      },
      options
    );
  }

  /**
   * Find related context for a given text
   */
  async findRelatedContext(
    text: string,
    projectPath?: string,
    options?: { threshold?: number; limit?: number }
  ): Promise<SemanticSearchResult<any>[]> {
    return this.searchSimilar(
      text,
      'context',
      async (sourceId) => {
        return await this.storage.getProjectContext(sourceId);
      },
      options
    );
  }

  /**
   * Get all embeddings by type (helper method)
   * Note: This is a brute-force approach. For large datasets, consider using a vector database
   */
  private async getAllEmbeddingsByType(
    sourceType: 'code' | 'chat' | 'doc' | 'context'
  ): Promise<EmbeddingRecord[]> {
    // This is a simplified implementation
    // In production, you'd want to add a method to SQLiteStorage to query by source_type
    // For now, we'll return an empty array and let the caller handle it
    // TODO: Add proper method to SQLiteStorage
    return [];
  }

  /**
   * Batch generate embeddings
   */
  async batchGenerateEmbeddings(
    items: Array<{
      sourceType: 'code' | 'chat' | 'doc' | 'context';
      sourceId: string;
      text: string;
    }>
  ): Promise<string[]> {
    const embeddingIds: string[] = [];

    for (const item of items) {
      try {
        const embeddingId = await this.saveEmbedding(
          item.sourceType,
          item.sourceId,
          item.text
        );
        embeddingIds.push(embeddingId);
      } catch (error) {
        console.error(`Failed to generate embedding for ${item.sourceId}:`, error);
        embeddingIds.push(''); // Push empty string to maintain array length
      }
    }

    return embeddingIds;
  }

  /**
   * Calculate similarity between two texts without storing
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding(text1),
      this.generateEmbedding(text2)
    ]);

    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Get embedding dimension
   */
  async getEmbeddingDimension(): Promise<number> {
    await this.initialize();
    // Generate a test embedding to get dimension
    const testEmbedding = await this.generateEmbedding('test');
    return testEmbedding.length;
  }
}
