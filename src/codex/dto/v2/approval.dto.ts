import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  type SwaggerSchema,
  APPROVAL_POLICY_VALUES,
  APPROVALS_REVIEWER_VALUES,
  oneOfSchema,
  stringEnumSchema,
} from './openapi.schema';

/** Granular approval settings mirrored from v2 AskForApproval. */
export class GranularApprovalOptionsDto {
  @ApiProperty()
  sandbox_approval!: boolean;

  @ApiProperty()
  rules!: boolean;

  @ApiProperty()
  skill_approval!: boolean;

  @ApiProperty()
  request_permissions!: boolean;

  @ApiProperty()
  mcp_elicitations!: boolean;
}

/** Object branch of v2 AskForApproval. */
export class GranularApprovalPolicyDto {
  @ApiProperty({ type: () => GranularApprovalOptionsDto })
  granular!: GranularApprovalOptionsDto;
}

/** OpenAPI schema for the v2 AskForApproval union. */
export function approvalPolicySchema(nullable = false): SwaggerSchema {
  return oneOfSchema(
    [
      stringEnumSchema(APPROVAL_POLICY_VALUES),
      { $ref: getSchemaPath(GranularApprovalPolicyDto) },
    ],
    nullable,
  );
}

/** OpenAPI schema for the v2 ApprovalsReviewer enum. */
export function approvalsReviewerSchema(): SwaggerSchema {
  return stringEnumSchema(APPROVALS_REVIEWER_VALUES);
}
