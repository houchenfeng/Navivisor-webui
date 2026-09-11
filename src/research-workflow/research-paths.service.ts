import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves research project filesystem roots.
 *
 * Managed projects still live under `NAVIVISOR_RESEARCH_WORK_ROOT/{uuid}`.
 * Workspace projects bind an arbitrary allowed directory via `bind()`.
 * Run/temp/artifact layout is always under `.navivisor/` inside the project root.
 */
@Injectable()
export class ResearchPathsService {
  readonly managedRoot: string;
  private readonly bindings = new Map<string, string>();

  constructor(config: ConfigService) {
    this.managedRoot = resolve(
      config.get<string>('NAVIVISOR_RESEARCH_WORK_ROOT')?.trim() ||
        join(homedir(), '.codex', 'research-projects'),
    );
  }

  /** @deprecated Use managedRoot; kept for older call sites/tests. */
  get root(): string {
    return this.managedRoot;
  }

  /**
   * Register or refresh the absolute root for a projectId.
   * Rejects symlink escape when the path exists: realpath must stay equal
   * to the normalized absolute path (or be a child under an allowed bind).
   */
  bind(projectId: string, absoluteRoot: string): string {
    this.assertId(projectId);
    const normalized = this.normalizeRoot(absoluteRoot);
    this.bindings.set(projectId, normalized);
    return normalized;
  }

  unbind(projectId: string): void {
    this.bindings.delete(projectId);
  }

  hasBinding(projectId: string): boolean {
    return this.bindings.has(projectId);
  }

  /** Absolute project root for a known projectId. */
  project(projectId: string): string {
    this.assertId(projectId);
    const bound = this.bindings.get(projectId);
    if (bound) return bound;
    return join(this.managedRoot, projectId);
  }

  managedProject(projectId: string): string {
    this.assertId(projectId);
    return join(this.managedRoot, projectId);
  }

  normalizeRoot(absoluteRoot: string): string {
    if (!absoluteRoot || !isAbsolute(absoluteRoot)) {
      throw new Error('Research project root must be an absolute path');
    }
    const resolved = resolve(absoluteRoot);
    try {
      const real = realpathSync(resolved);
      // Allow the directory itself or a realpath that still maps to the same path.
      if (this.samePath(real, resolved)) return resolved;
      // If the path is a symlink to another location, bind the real path and
      // require callers to re-register after moves.
      return real;
    } catch {
      // Directory may not exist yet (new project init).
      return resolved;
    }
  }

  navivisor(projectId: string): string {
    return join(this.project(projectId), '.navivisor');
  }

  projectIndex(projectId: string): string {
    return join(this.navivisor(projectId), 'project-index.json');
  }

  recoveryDir(projectId: string): string {
    return join(this.navivisor(projectId), 'recovery');
  }

  conversationsDir(projectId: string): string {
    return join(this.navivisor(projectId), 'conversations');
  }

  run(projectId: string, runId: string): string {
    this.assertId(runId);
    return join(this.navivisor(projectId), 'runs', runId);
  }

  manifest(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'manifest.json');
  }

  context(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'context.json');
  }

  events(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'events.jsonl');
  }

  temp(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'temp');
  }

  /** Immutable artifact snapshot directory for one artifactId. */
  artifactDir(projectId: string, artifactId: string): string {
    this.assertId(artifactId);
    return join(this.navivisor(projectId), 'artifacts', artifactId);
  }

  /**
   * @deprecated Prefer artifactDir + basename. Kept for finalize that still
   * writes under run-scoped folders during migration.
   */
  artifacts(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'artifacts');
  }

  relativeToProject(projectId: string, absolutePath: string): string {
    const rel = relative(
      this.project(projectId),
      resolve(absolutePath),
    ).replaceAll('\\', '/');
    if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel))
      throw new Error('Path escapes research project');
    return rel;
  }

  resolveProjectRelative(projectId: string, path: string): string {
    if (!path || isAbsolute(path) || path.split(/[\\/]/).includes('..'))
      throw new Error('Invalid project-relative path');
    const target = resolve(this.project(projectId), path);
    this.relativeToProject(projectId, target);
    return target;
  }

  private samePath(a: string, b: string): boolean {
    const na = resolve(a).replace(/[/\\]+$/, '');
    const nb = resolve(b).replace(/[/\\]+$/, '');
    if (process.platform === 'win32') {
      return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
  }

  private assertId(id: string): void {
    if (!UUID.test(id)) throw new Error('Invalid research identifier');
  }
}
