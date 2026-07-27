import { Artifact, ArtifactId } from '../../core/domain/entities/Artifact.js';
import type { ArtifactRepository } from '../../core/ports/ArtifactRepository.js';
import type { EventBus } from '../../core/ports/EventBus.js';
import { ArtifactCreatedEvent } from '../../core/domain/events/ArtifactCreatedEvent.js';

// ── Command ──────────────────────────────────────────────────────────────────
export interface CreateArtifactCommand {
  conversationId: string;
  userId: string;
  title: string;
  content: string;
  language?: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export class CreateArtifactHandler {
  constructor(
    private readonly repository: ArtifactRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateArtifactCommand): Promise<string> {
    // Domain object creation (includes validation + sanitization)
    const artifact = Artifact.create({
      conversationId: command.conversationId,
      userId: command.userId,
      title: command.title.trim().slice(0, 200),
      content: command.content,
      language: command.language,
    });

    // Persist
    await this.repository.save(artifact);

    // Publish domain event
    await this.eventBus.publish(
      new ArtifactCreatedEvent(
        artifact.id.toString(),
        artifact.conversationId,
        artifact.metadata,
      ),
    );

    return artifact.id.toString();
  }
}

// ── Update Command ────────────────────────────────────────────────────────────
export interface UpdateArtifactCommand {
  artifactId: string;
  userId: string;
  content?: string;
  title?: string;
}

// ── Delete Command ────────────────────────────────────────────────────────────
export interface DeleteArtifactCommand {
  artifactId: string;
  userId: string;
}
