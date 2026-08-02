import { Module } from '@nestjs/common';
import { CorporateWikiService } from './corporate-wiki.service';
import { CorporateWikiController } from './corporate-wiki.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CorporateWikiController],
  providers: [CorporateWikiService],
})
export class CorporateWikiModule {}
