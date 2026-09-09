import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Standard success response for endpoints that only acknowledge an action. */
export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

/** Standardized HTTP error response shape with i18n error code. */
export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'files.path_not_found' })
  errorCode!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Path not found' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message!: string | string[];

  @ApiPropertyOptional({
    type: Object,
    example: { path: '/workspace/file.txt' },
    description:
      'Interpolation parameters for frontend i18n translation of errorCode.',
  })
  params?: Record<string, string | number>;
}
