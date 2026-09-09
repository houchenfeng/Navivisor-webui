import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { RarArchiveAdapter } from './adapters/rar-archive.adapter';
import { SevenZipArchiveAdapter } from './adapters/sevenzip-archive.adapter';
import { TarArchiveAdapter } from './adapters/tar-archive.adapter';
import { ZipArchiveAdapter } from './adapters/zip-archive.adapter';

@Module({
  imports: [FilesModule],
  controllers: [ArchiveController],
  providers: [
    ArchiveService,
    ZipArchiveAdapter,
    TarArchiveAdapter,
    RarArchiveAdapter,
    SevenZipArchiveAdapter,
  ],
})
export class ArchiveModule {}
