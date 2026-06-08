import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProcessStatus, ProcessStepType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProcessCenterService } from './process-center.service';

class ProcessStepDto {
  @IsString() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() type: ProcessStepType;
  @IsNumber() @IsOptional() order?: number;
  @IsOptional() content?: any;
  @IsBoolean() @IsOptional() isRequired?: boolean;
  @IsNumber() @IsOptional() estimatedMin?: number;
  @IsArray() @IsOptional() checklistItems?: { label: string; isRequired?: boolean; order?: number }[];
}

class CreateProcessDto {
  @IsString() companyId: string;
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() teamId?: string;
  @IsString() @IsOptional() status?: ProcessStatus;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() color?: string;
  @IsArray() @IsOptional() steps?: ProcessStepDto[];
}

@ApiTags('process-center')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('process-center')
export class ProcessCenterController {
  constructor(private readonly service: ProcessCenterService) {}

  @Get()
  @ApiOperation({ summary: 'Listar processos' })
  list(@Query('companyId') companyId: string) {
    return this.service.list(companyId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateProcessDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProcessDto>) {
    return this.service.update(id, dto);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.start(id, userId);
  }

  @Patch('instances/:instanceStepId/step')
  completeStep(
    @Param('instanceStepId') instanceStepId: string,
    @Body() body: { status?: string; notes?: string; answers?: { itemId: string; isChecked: boolean }[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateInstanceStep(instanceStepId, body, userId);
  }
}
