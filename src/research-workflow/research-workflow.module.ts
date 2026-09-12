import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CodexModule } from '../codex/codex.module';
import { FilesModule } from '../files/files.module';
import { SkillsModule } from '../skills/skills.module';
import { ThreadsModule } from '../threads/threads.module';
import { ResearchAgentSessionService } from './research-agent-session.service';
import { ResearchCodexBridgeService } from './research-codex-bridge.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchResultValidatorService } from './research-result-validator.service';
import { ResearchRunEventsService } from './research-run-events.service';
import { ResearchSkillRegistryService } from './research-skill-registry.service';
import { ResearchSshRunnerController } from './research-ssh-runner.controller';
import { ResearchSshRunnerService } from './research-ssh-runner.service';
import { ResearchWorkspaceController } from './research-workspace.controller';
import { ResearchWorkspaceService } from './research-workspace.service';
import { ResearchWorkflowController } from './research-workflow.controller';
import { ResearchWorkflowService } from './research-workflow.service';

@Module({
  imports: [
    CodexModule,
    DatabaseModule,
    FilesModule,
    SkillsModule,
    ThreadsModule,
  ],
  controllers: [ResearchWorkflowController, ResearchWorkspaceController, ResearchSshRunnerController],
  providers: [
    ResearchPathsService,
    ResearchResultValidatorService,
    ResearchRunEventsService,
    ResearchAgentSessionService,
    ResearchCodexBridgeService,
    ResearchSkillRegistryService,
    ResearchSshRunnerService,
    ResearchWorkflowService,
    ResearchWorkspaceService,
  ],
  exports: [
    ResearchPathsService,
    ResearchResultValidatorService,
    ResearchAgentSessionService,
    ResearchCodexBridgeService,
    ResearchSkillRegistryService,
    ResearchWorkflowService,
    ResearchWorkspaceService,
  ],
})
export class ResearchWorkflowModule {}
