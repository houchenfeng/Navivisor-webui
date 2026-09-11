import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CodexModule } from '../codex/codex.module';
import { SkillsModule } from '../skills/skills.module';
import { ThreadsModule } from '../threads/threads.module';
import { ResearchAgentSessionService } from './research-agent-session.service';
import { ResearchCodexBridgeService } from './research-codex-bridge.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchSkillRegistryService } from './research-skill-registry.service';
import { ResearchWorkflowController } from './research-workflow.controller';
import { ResearchWorkflowService } from './research-workflow.service';

@Module({
  imports: [CodexModule, DatabaseModule, SkillsModule, ThreadsModule],
  controllers: [ResearchWorkflowController],
  providers: [
    ResearchPathsService,
    ResearchAgentSessionService,
    ResearchCodexBridgeService,
    ResearchSkillRegistryService,
    ResearchWorkflowService,
  ],
  exports: [
    ResearchPathsService,
    ResearchAgentSessionService,
    ResearchCodexBridgeService,
    ResearchSkillRegistryService,
    ResearchWorkflowService,
  ],
})
export class ResearchWorkflowModule {}
