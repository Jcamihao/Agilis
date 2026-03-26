import { Module } from '@nestjs/common';
import { TaskLogsModule } from '../task-logs/task-logs.module';
import { UsersModule } from '../users/users.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [UsersModule, TaskLogsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
