import type { ArtifactRepository } from '../../core/ports/ArtifactRepository.js';
import { ArtifactId } from '../../core/domain/entities/Artifact.js';

// ── Query: Get artifact by ID ─────────────────────────────────────────────────
export interface GetArtifactQuery {
  artifactId: string;
  userId: string; // for authorization check
}

export class GetArtifactHandler {
  constructor(private readonly repository: ArtifactRepository) {}

  async execute(query: GetArtifactQuery) {
    const artifact = await this.repository.findById(new ArtifactId(query.artifactId));
    if (!artifact) return null;
    if (artifact.userId !== query.userId) {
      throw new Error('Unauthorized: artifact belongs to another user');
    }
    return artifact.toPlainObject();
  }
}

// ── Query: List artifacts by conversation ─────────────────────────────────────
export interface ListArtifactsQuery {
  conversationId?: string;
  userId: string;
  limit?: number;
}

export class ListArtifactsHandler {
  constructor(private readonly repository: ArtifactRepository) {}

  async execute(query: ListArtifactsQuery) {
    if (query.conversationId) {
      const artifacts = await this.repository.findByConversationId(query.conversationId);
      return artifacts.filter((a) => a.userId === query.userId).map((a) => a.toPlainObject());
    }
    const artifacts = await this.repository.findByUserId(query.userId, query.limit ?? 50);
    return artifacts.map((a) => a.toPlainObject());
  }
}
