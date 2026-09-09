import { ApiProperty } from '@nestjs/swagger';

/** Response returned after staging a browser-uploaded chat attachment. */
export class ChatUploadResponseDto {
  @ApiProperty({
    description: 'Absolute filesystem path readable by Codex app-server.',
  })
  path!: string;

  @ApiProperty({ description: 'Stored file size in bytes.' })
  size!: number;

  @ApiProperty({ description: 'MIME type reported by the multipart request.' })
  mimeType!: string;
}
