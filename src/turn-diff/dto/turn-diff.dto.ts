import { ApiProperty } from '@nestjs/swagger';

/** A single persisted turn-level diff. */
export class TurnDiffEntryDto {
  @ApiProperty()
  turnId!: string;

  @ApiProperty()
  diff!: string;

  @ApiProperty()
  updatedAt!: number;
}

/** Turn diff query response for hydrating the frontend DiffViewer on resume. */
export class ThreadTurnDiffsResponseDto {
  @ApiProperty()
  threadId!: string;

  @ApiProperty({ type: () => [TurnDiffEntryDto] })
  turns!: TurnDiffEntryDto[];
}
