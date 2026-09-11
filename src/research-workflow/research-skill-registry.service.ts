import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CodexProcessManager } from '../codex/codex-process-manager.service';
import type { v2 } from '../codex/codex-schema';
import { SkillsService } from '../skills/skills.service';
import {
  moduleForStage,
  type ResearchModule,
  type ResearchStage,
} from './research-contracts';

const SKILL_FOR_MODULE: Record<ResearchModule, string> = {
  topic: 'research-topic',
  experiment: 'research-experiment',
  writing: 'research-writing',
  submission: 'research-submission',
};

export type ResolvedResearchSkill = v2.SkillMetadata & { sha256: string };

@Injectable()
export class ResearchSkillRegistryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ResearchSkillRegistryService.name);
  private readonly skillRoot = join(process.cwd(), 'research-skills');
  private readonly cache = new Map<string, v2.SkillMetadata[]>();
  private unsubscribe?: () => void;

  constructor(
    private readonly processManager: CodexProcessManager,
    private readonly skills: SkillsService,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.processManager.addLifecycleListener((event) => {
      if (event.type === 'appServerReady') {
        void this.register(event.generation);
      } else {
        this.cache.clear();
      }
    });
    if (this.processManager.getClient()) {
      void this.register(this.processManager.getGeneration());
    }
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  async resolveForStage(
    cwd: string,
    stage: ResearchStage,
  ): Promise<ResolvedResearchSkill> {
    const expectedName = SKILL_FOR_MODULE[moduleForStage(stage)];
    const available = await this.list(cwd);
    const skill = available.find(
      (candidate) => candidate.name === expectedName && candidate.enabled,
    );
    if (!skill) {
      throw new BadRequestException(
        `Required research skill is unavailable: ${expectedName}`,
      );
    }
    const root = await realpath(this.skillRoot);
    const skillPath = await realpath(String(skill.path));
    const pathFromRoot = relative(root, skillPath);
    if (
      pathFromRoot.startsWith('..') ||
      pathFromRoot === '' ||
      pathFromRoot.includes(':')
    ) {
      throw new BadRequestException('Research skill path is outside its root');
    }
    const body = await readFile(skillPath);
    return {
      ...skill,
      path: skillPath,
      sha256: createHash('sha256').update(body).digest('hex'),
    };
  }

  private async register(generation: number): Promise<void> {
    try {
      await this.skills.setExtraRoots({ extraRoots: [this.skillRoot] });
      this.cache.clear();
      this.logger.log(
        `Registered research skill root for app-server generation ${generation}`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not register research skills: ${(error as Error).message}`,
      );
    }
  }

  private async list(cwd: string): Promise<v2.SkillMetadata[]> {
    const normalizedCwd = await realpath(cwd);
    const key = `${this.processManager.getGeneration()}:${normalizedCwd}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const response = await this.skills.listSkills({
      cwds: [normalizedCwd],
      forceReload: true,
    });
    const found = response.data.find((entry) => entry.cwd === normalizedCwd);
    const result = found?.skills ?? [];
    this.cache.set(key, result);
    return result;
  }
}
