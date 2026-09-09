import { Module } from '@nestjs/common';
import { CodexModule } from '../codex/codex.module';
import { McpServersController } from './mcp-servers.controller';
import { McpServersService } from './mcp-servers.service';

@Module({
  imports: [CodexModule],
  controllers: [McpServersController],
  providers: [McpServersService],
  exports: [McpServersService],
})
export class McpServersModule {}
