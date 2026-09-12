import { Module } from '@nestjs/common';
import { ResearchWorkflowModule } from '../research-workflow/research-workflow.module';
import { ResearchTopicController } from './research-topic.controller';
import { ResearchTopicService } from './research-topic.service';

@Module({
  imports: [ResearchWorkflowModule],
  controllers: [ResearchTopicController],
  providers: [ResearchTopicService],
})
export class ResearchTopicModule {}
