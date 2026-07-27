import type { Artifact, ArtifactId } from '../domain/entities/Artifact.js';

export interface ArtifactRepository {
  save(artifact: Artifact): Promise<void>;
  findById(id: ArtifactId): Promise<Artifact | null>;
  findByConversationId(conversationId: string): Promise<Artifact[]>;
  findByUserId(userId: string, limit?: number): Promise<Artifact[]>;
  delete(id: ArtifactId): Promise<void>;
  update(artifact: Artifact): Promise<void>;
}
