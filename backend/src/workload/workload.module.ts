import { Module } from '@nestjs/common';
import { WorkloadService } from './workload.service';
import { WorkloadController } from './workload.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports:     [AiModule],
  providers:   [WorkloadService],
  controllers: [WorkloadController],
  exports:     [WorkloadService],
})
export class WorkloadModule {}
