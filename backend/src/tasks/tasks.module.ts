import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditModule } from '../audit/audit.module';
import { OkrsModule } from '../okrs/okrs.module';

@Module({
  imports: [AuditModule, OkrsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
