import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RateLimitGuard],
  exports: [UsersService],
})
export class UsersModule {}
