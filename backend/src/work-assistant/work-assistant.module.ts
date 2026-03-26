import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkAssistantController } from './work-assistant.controller';
import { WorkAssistantService } from './work-assistant.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkAssistantController],
  providers: [WorkAssistantService],
})
export class WorkAssistantModule {}
