import { Module } from '@nestjs/common';
import { TaskStatusConfigService } from './task-status-config.service';
import { TaskStatusConfigController } from './task-status-config.controller';

@Module({
  controllers: [TaskStatusConfigController],
  providers: [TaskStatusConfigService],
  exports: [TaskStatusConfigService],
})
export class TaskStatusConfigModule {}
