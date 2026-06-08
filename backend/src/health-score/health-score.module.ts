import { Module } from '@nestjs/common';
import { HealthScoreController } from './health-score.controller';
import { HealthScoreService } from './health-score.service';

@Module({
  controllers: [HealthScoreController],
  providers: [HealthScoreService],
  exports: [HealthScoreService],
})
export class HealthScoreModule {}
