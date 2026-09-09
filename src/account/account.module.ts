import { Module } from '@nestjs/common';
import { CodexModule } from '../codex/codex.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [CodexModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
