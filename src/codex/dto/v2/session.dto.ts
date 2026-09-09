import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  type SwaggerSchema,
  NULLABLE_STRING_SCHEMA,
  SESSION_SOURCE_STRING_VALUES,
  SUB_AGENT_SOURCE_STRING_VALUES,
  oneOfSchema,
  stringEnumSchema,
} from './openapi.schema';

/** Payload carried by the thread_spawn sub-agent source branch. */
export class SubAgentThreadSpawnPayloadDto {
  @ApiProperty()
  parent_thread_id!: string;

  @ApiProperty()
  depth!: number;

  @ApiProperty(NULLABLE_STRING_SCHEMA)
  agent_path!: string | null;

  @ApiProperty(NULLABLE_STRING_SCHEMA)
  agent_nickname!: string | null;

  @ApiProperty(NULLABLE_STRING_SCHEMA)
  agent_role!: string | null;
}

/** Object branch of v2 SubAgentSource for spawned threads. */
export class SubAgentThreadSpawnSourceDto {
  @ApiProperty({ type: () => SubAgentThreadSpawnPayloadDto })
  thread_spawn!: SubAgentThreadSpawnPayloadDto;
}

/** Object branch of v2 SubAgentSource for custom sub-agent origins. */
export class SubAgentOtherSourceDto {
  @ApiProperty()
  other!: string;
}

/** Object branch of v2 SessionSource for custom sources. */
export class SessionSourceCustomDto {
  @ApiProperty()
  custom!: string;
}

/** Object branch of v2 SessionSource for sub-agent sources. */
export class SessionSourceSubAgentDto {
  @ApiProperty(subAgentSourceSchema())
  subAgent!: string | SubAgentThreadSpawnSourceDto | SubAgentOtherSourceDto;
}

/** OpenAPI schema for v2 SubAgentSource. */
export function subAgentSourceSchema(nullable = false): SwaggerSchema {
  return oneOfSchema(
    [
      stringEnumSchema(SUB_AGENT_SOURCE_STRING_VALUES),
      { $ref: getSchemaPath(SubAgentThreadSpawnSourceDto) },
      { $ref: getSchemaPath(SubAgentOtherSourceDto) },
    ],
    nullable,
  );
}

/** OpenAPI schema for v2 SessionSource. */
export function sessionSourceSchema(nullable = false): SwaggerSchema {
  return oneOfSchema(
    [
      stringEnumSchema(SESSION_SOURCE_STRING_VALUES),
      { $ref: getSchemaPath(SessionSourceCustomDto) },
      { $ref: getSchemaPath(SessionSourceSubAgentDto) },
    ],
    nullable,
  );
}
