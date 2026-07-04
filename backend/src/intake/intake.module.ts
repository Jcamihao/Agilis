import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeFormsController, IntakePublicController } from './intake.controller';

@Module({
  providers:   [IntakeService],
  controllers: [IntakeFormsController, IntakePublicController],
})
export class IntakeModule {}
