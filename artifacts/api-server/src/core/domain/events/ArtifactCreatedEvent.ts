import type { ContentMetadata } from '../entities/Artifact.js';

export class ArtifactCreatedEvent {
  readonly eventType = 'artifact.created';
  readonly occurredAt: Date;

  constructor(
    readonly artifactId: string,
    readonly conversationId: string,
    readonly metadata: ContentMetadata,
  ) {
    this.occurredAt = new Date();
  }
}

export class ArtifactUpdatedEvent {
  readonly eventType = 'artifact.updated';
  readonly occurredAt: Date;
  constructor(readonly artifactId: string, readonly version: number) {
    this.occurredAt = new Date();
  }
}

export class ArtifactDeletedEvent {
  readonly eventType = 'artifact.deleted';
  readonly occurredAt: Date;
  constructor(readonly artifactId: string) {
    this.occurredAt = new Date();
  }
}

export type DomainEvent = ArtifactCreatedEvent | ArtifactUpdatedEvent | ArtifactDeletedEvent;
