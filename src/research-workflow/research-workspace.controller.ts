import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { isResearchArtifactRole, isResearchStage } from './research-contracts';
import { ResearchWorkspaceService } from './research-workspace.service';

class RegisterWorkspaceDto {
  @ApiProperty({ description: 'Absolute server-side directory path' })
  absolutePath!: string;

  @ApiPropertyOptional() title?: string;

  @ApiPropertyOptional({
    description: 'Relative module directory names within the paper root',
  })
  directories?: {
    topic?: string;
    experiment?: string;
    writing?: string;
    submission?: string;
  };

  @ApiPropertyOptional({ default: true })
  createIfMissing?: boolean;
}

class SaveVersionDto {
  @ApiProperty() relativePath!: string;
  @ApiProperty() role!: string;
  @ApiProperty() stage!: string;
  @ApiPropertyOptional({ enum: ['simulated', 'real'] }) mode?: string;
  @ApiPropertyOptional() simulated?: boolean;
}

@ApiTags('research-workspace')
@ApiBearerAuth()
@Controller('research')
export class ResearchWorkspaceController {
  constructor(private readonly workspaces: ResearchWorkspaceService) {}

  @Post('workspaces/register')
  register(@Body() body: RegisterWorkspaceDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) {
      throw new BadRequestException('absolutePath is required');
    }
    return this.workspaces.registerWorkspace({
      absolutePath,
      title: body.title,
      directories: body.directories as
        | Partial<Record<'topic' | 'experiment' | 'writing' | 'submission', string>>
        | undefined,
      createIfMissing: body.createIfMissing ?? true,
    });
  }

  @Get('projects/:projectId/workspace')
  getWorkspace(@Param('projectId') projectId: string) {
    return this.workspaces.getWorkspace(projectId);
  }

  @Post('projects/:projectId/workspace/scan')
  scan(@Param('projectId') projectId: string) {
    return this.workspaces.scanWorkspace(projectId);
  }

  @Post('projects/:projectId/demo/load')
  loadDemo(@Param('projectId') projectId: string) {
    return this.workspaces.loadDemoFromWorkspace(projectId);
  }

  @Post('projects/:projectId/artifacts/save-version')
  saveVersion(
    @Param('projectId') projectId: string,
    @Body() body: SaveVersionDto,
  ) {
    const relativePath = body?.relativePath?.trim();
    if (!relativePath) {
      throw new BadRequestException('relativePath is required');
    }
    if (!isResearchArtifactRole(body.role) || !isResearchStage(body.stage)) {
      throw new BadRequestException('Invalid role or stage');
    }
    return this.workspaces.saveVersion(projectId, relativePath, body.role, {
      stage: body.stage,
      mode: body.mode === 'real' ? 'real' : 'simulated',
      simulated: body.simulated,
    });
  }
}
