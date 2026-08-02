import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { AuditModule } from '../audit/audit.module';
import { OkrsModule } from '../okrs/okrs.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuditModule, OkrsModule, PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, TaskSchedulerService],
  exports: [TasksService],
})
export class TasksModule {}
