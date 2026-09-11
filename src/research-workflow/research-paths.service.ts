import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ResearchPathsService {
  readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(
      config.get<string>('NAVIVISOR_RESEARCH_WORK_ROOT')?.trim() ||
        join(homedir(), '.codex', 'research-projects'),
    );
  }

  project(projectId: string): string {
    this.assertId(projectId);
    return join(this.root, projectId);
  }

  run(projectId: string, runId: string): string {
    this.assertId(runId);
    return join(this.project(projectId), 'runs', runId);
  }

  manifest(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'manifest.json');
  }

  temp(projectId: string, runId: string): string {
    return join(this.run(projectId, runId), 'temp');
  }

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

  private assertId(id: string): void {
    if (!UUID.test(id)) throw new Error('Invalid research identifier');
  }
}
