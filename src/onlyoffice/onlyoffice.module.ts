import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { SettingsModule } from '../settings/settings.module';
import { OnlyOfficeController } from './onlyoffice.controller';

@Module({
  imports: [FilesModule, SettingsModule],
  controllers: [OnlyOfficeController],
})
export class OnlyOfficeModule {}
