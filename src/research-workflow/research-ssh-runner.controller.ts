import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ResearchSshRunnerService } from './research-ssh-runner.service';

class StartSshExperimentDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() host!: string;
  @ApiPropertyOptional({default:22}) port?: number;
  @ApiProperty() username!: string;
  @ApiPropertyOptional({description:'Used only for this connection; never persisted'}) password?: string;
  @ApiPropertyOptional({description:'PEM private key; used only for this connection'}) privateKey?: string;
  @ApiProperty() codeDir!: string;
  @ApiProperty() dataDir!: string;
  @ApiProperty() resultsDir!: string;
  @ApiProperty() documentDir!: string;
  @ApiPropertyOptional({default:'yolo26'}) condaEnv?: string;
  @ApiProperty({description:'Markdown experiment specification'}) experimentDocument!: string;
}

@ApiTags('research-ssh-runner')
@Controller('research/ssh-experiments')
export class ResearchSshRunnerController {
  constructor(private readonly runner:ResearchSshRunnerService) {}
  @Post() start(@Body() body:StartSshExperimentDto){return this.runner.start(body);}
  @Get(':jobId') get(@Param('jobId') jobId:string){return this.runner.get(jobId);}
}

