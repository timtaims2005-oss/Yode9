import { v4 as uuidv4 } from 'uuid';

// ── Value Object: ArtifactId ─────────────────────────────────────────────────
export class ArtifactId {
  private readonly value: string;

  constructor(id?: string) {
    this.value = id || uuidv4();
  }

  toString(): string { return this.value; }

  equals(other: ArtifactId): boolean {
    return this.value === other.value;
  }
}

// ── Value Object: CodeContent ────────────────────────────────────────────────
export class CodeContent {
  private readonly content: string;
  private readonly language: SupportedLanguage;
  private readonly metadata: ContentMetadata;

  constructor(content: string, language?: string) {
    this.content = this.sanitize(content);
    this.language = this.detectLanguage(content);
    this.metadata = this.analyze(content);
  }

  private sanitize(code: string): string {
    // Security: Remove dangerous patterns (XSS, injection vectors)
    return code
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/i, '')
      .replace(/on\w+\s*=/gi, '');
  }

  private detectLanguage(code: string): SupportedLanguage {
    if (code.includes('import React') || code.includes('export default') || code.trim().startsWith('import ')) return 'typescript';
    if (code.includes('<!DOCTYPE html>') || code.includes('<html>')) return 'html';
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
    if (code.trim().startsWith('{') || code.trim().startsWith('[')) return 'json';
    if (code.includes('body {') || code.includes('@media')) return 'css';
    return 'json';
  }

  private analyze(content: string): ContentMetadata {
    const lines = content.split('\n').length;
    const hasAsync = content.includes('async') || content.includes('await') || content.includes('Promise');
    return {
      lines,
      complexity: lines > 50 ? 'complex' : lines > 20 ? 'moderate' : 'simple',
      runnable: ['html', 'typescript', 'javascript'].includes(this.language),
      hasTests: content.includes('test(') || content.includes('describe(') || content.includes('it('),
      hasAsync,
      estimatedExecutionTime: this.estimateExecutionTime(lines),
    };
  }

  private estimateExecutionTime(lines: number): number {
    return Math.min(lines * 10, 10000); // 10ms per line, max 10s
  }

  getContent(): string { return this.content; }
  getLanguage(): SupportedLanguage { return this.language; }
  getMetadata(): ContentMetadata { return this.metadata; }

  shouldShowArtifact(): boolean {
    return this.metadata.lines > 20 || this.metadata.runnable;
  }
}

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'html' | 'css' | 'json';

export interface ContentMetadata {
  lines: number;
  complexity: 'simple' | 'moderate' | 'complex';
  runnable: boolean;
  hasTests: boolean;
  hasAsync: boolean;
  estimatedExecutionTime: number;
}

// ── Aggregate Root: Artifact ─────────────────────────────────────────────────
export interface ArtifactProps {
  id: ArtifactId;
  conversationId: string;
  userId: string;
  title: string;
  content: string;
  language: SupportedLanguage;
  metadata: ContentMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Artifact {
  private props: ArtifactProps;

  constructor(props: ArtifactProps) {
    this.props = props;
  }

  static create(params: {
    conversationId: string;
    userId: string;
    title: string;
    content: string;
    language?: string;
  }): Artifact {
    const codeContent = new CodeContent(params.content, params.language);
    if (!codeContent.shouldShowArtifact()) {
      throw new Error('Content does not meet artifact criteria (< 20 lines and not runnable)');
    }
    return new Artifact({
      id: new ArtifactId(),
      conversationId: params.conversationId,
      userId: params.userId,
      title: params.title,
      content: codeContent.getContent(),
      language: codeContent.getLanguage(),
      metadata: codeContent.getMetadata(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get id(): ArtifactId { return this.props.id; }
  get conversationId(): string { return this.props.conversationId; }
  get userId(): string { return this.props.userId; }
  get title(): string { return this.props.title; }
  get content(): string { return this.props.content; }
  get language(): SupportedLanguage { return this.props.language; }
  get metadata(): ContentMetadata { return this.props.metadata; }
  get version(): number { return this.props.version; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toPlainObject(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      conversationId: this.props.conversationId,
      userId: this.props.userId,
      title: this.props.title,
      content: this.props.content,
      language: this.props.language,
      metadata: this.props.metadata,
      version: this.props.version,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
