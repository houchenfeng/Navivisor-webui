/** Swagger DTOs for archive browsing and single-entry preview endpoints. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Archive entry tree node returned by the archive list endpoint. */
export class ArchiveEntryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ enum: ['file', 'directory'] })
  type!: 'file' | 'directory';

  @ApiPropertyOptional()
  size?: number;

  @ApiPropertyOptional()
  compressedSize?: number;

  @ApiPropertyOptional()
  mtime?: number;

  @ApiPropertyOptional()
  encrypted?: boolean;

  @ApiPropertyOptional()
  unsupported?: boolean;

  @ApiPropertyOptional({ type: () => [ArchiveEntryDto] })
  children?: ArchiveEntryDto[];
}

/** Response for listing archive contents as a directory tree. */
export class ArchiveListResponseDto {
  @ApiProperty()
  path!: string;

  @ApiProperty({ type: () => [ArchiveEntryDto] })
  entries!: ArchiveEntryDto[];
}
