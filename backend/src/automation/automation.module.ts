import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationEngine } from './automation.engine';
import { AutomationCron } from './automation.cron';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [NotificationsModule, TelegramModule, MailModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationEngine, AutomationCron],
  exports: [AutomationService],
})
export class AutomationModule {}
