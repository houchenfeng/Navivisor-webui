import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { ChatController } from './chat.controller';
import { ChatUploadService } from './chat-upload.service';

@Module({
  imports: [SettingsModule],
  controllers: [ChatController],
  providers: [ChatUploadService],
  exports: [ChatUploadService],
})
export class ChatModule {}
