import { Module } from '@nestjs/common';
import { ResearchWritingController } from './research-writing.controller';
import { ResearchWritingService } from './research-writing.service';

@Module({
  controllers: [ResearchWritingController],
  providers: [ResearchWritingService],
})
export class ResearchWritingModule {}
