import { Module } from '@nestjs/common';
import { ProcessCenterController } from './process-center.controller';
import { ProcessCenterService } from './process-center.service';

@Module({
  controllers: [ProcessCenterController],
  providers: [ProcessCenterService],
  exports: [ProcessCenterService],
})
export class ProcessCenterModule {}
