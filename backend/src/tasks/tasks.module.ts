import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, TaskSchedulerService],
  exports: [TasksService],
})
export class TasksModule {}
