import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CalendarModule } from './calendar/calendar.module';
import { DashboardWidgetsModule } from './dashboard-widgets/dashboard-widgets.module';
import { AttachmentsModule } from './attachments/attachments.module';
// V3
import { AuditModule } from './audit/audit.module';
import { AutomationModule } from './automation/automation.module';
import { SlaModule } from './sla/sla.module';
import { MetricsModule } from './metrics/metrics.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { HealthScoreModule } from './health-score/health-score.module';
import { ProcessCenterModule } from './process-center/process-center.module';
import { InsightsModule } from './insights/insights.module';
import { SprintsModule } from './sprints/sprints.module';
import { WebhookModule } from './webhooks/webhook.module';
import { TelegramModule } from './telegram/telegram.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { MailModule } from './mail/mail.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', maxListeners: 20 }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    CalendarModule,
    DashboardWidgetsModule,
    AttachmentsModule,
    AuditModule,
    AutomationModule,
    SlaModule,
    MetricsModule,
    ReportsModule,
    AiModule,
    HealthScoreModule,
    ProcessCenterModule,
    InsightsModule,
    SprintsModule,
    WebhookModule,
    TelegramModule,
    RedisModule,
    QueueModule,
    MailModule,
    TimeTrackingModule,
  ],
})
export class AppModule {}
