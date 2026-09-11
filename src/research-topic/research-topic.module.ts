import { Module } from '@nestjs/common';
import { ResearchTopicController } from './research-topic.controller';
import { ResearchTopicService } from './research-topic.service';

@Module({
  controllers: [ResearchTopicController],
  providers: [ResearchTopicService],
})
export class ResearchTopicModule {}
