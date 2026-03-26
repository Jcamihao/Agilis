import { Module } from '@nestjs/common';
import { TaskLogsService } from './task-logs.service';

@Module({
  providers: [TaskLogsService],
  exports: [TaskLogsService],
})
export class TaskLogsModule {}
