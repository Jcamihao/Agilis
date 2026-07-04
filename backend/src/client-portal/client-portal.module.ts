import { Module } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController, ClientPortalPublicController } from './client-portal.controller';

@Module({
  providers:   [ClientPortalService],
  controllers: [ClientPortalController, ClientPortalPublicController],
})
export class ClientPortalModule {}
