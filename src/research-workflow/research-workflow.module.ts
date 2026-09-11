import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ResearchPathsService } from './research-paths.service';
import { ResearchWorkflowController } from './research-workflow.controller';
import { ResearchWorkflowService } from './research-workflow.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ResearchWorkflowController],
  providers: [ResearchPathsService, ResearchWorkflowService],
  exports: [ResearchPathsService, ResearchWorkflowService],
})
export class ResearchWorkflowModule {}
