import { ApiProperty } from '@nestjs/swagger';

/** Health-check response returned by the root app controller. */
export class StatusResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}
