/** Swagger DTOs for OnlyOffice editor config and save callback. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Response containing a signed OnlyOffice editor config and API script URL. */
export class OnlyOfficeConfigResponseDto {
  @ApiProperty()
  scriptUrl!: string;

  @ApiProperty({ type: Object })
  config!: Record<string, unknown>;
}

/**
 * OnlyOffice Document Server callback body.
 * @see https://api.onlyoffice.com/editors/callback
 */
export class OnlyOfficeCallbackDto {
  /** Document editing status: 1=editing, 2=ready to save, 4=closed without changes, 6=force save, 7=error. */
  @ApiProperty()
  status!: number;

  /** Download URL for the modified document (present when status=2 or status=6). */
  @ApiPropertyOptional()
  url?: string;

  /** Document key matching the one provided in the editor config. */
  @ApiPropertyOptional()
  key?: string;

  /** JWT token signed by OnlyOffice Docs for outgoing callback requests. */
  @ApiPropertyOptional()
  token?: string;

  /** Array of user IDs who edited the document. */
  @ApiPropertyOptional({ type: [String] })
  users?: string[];
}
