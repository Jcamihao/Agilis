import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationTrigger } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationActionType } from './enum/automation-action-type.enum';

export class AutomationActionItemDto {
  @IsEnum(AutomationActionType)
  type: AutomationActionType;

  @Allow()
  @IsOptional()
  params?: Record<string, any>;
}

export class AutomationConditionItemDto {
  @IsString() field: string;
  @IsString() operator: string;
  @Allow() value: any;
}

export class CreateAutomationDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsUUID() companyId: string;
  @IsUUID() @IsOptional() projectId?: string;
  @IsEnum(AutomationTrigger) trigger: AutomationTrigger;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionItemDto)
  conditions: AutomationConditionItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionItemDto)
  actions: AutomationActionItemDto[];

  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, userId: string) {
    await this.checkAccess(companyId, userId);

    return this.prisma.automationRule.findMany({
      where: { companyId },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        executions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!rule) throw new NotFoundException('Regra não encontrada');
    await this.checkAccess(rule.companyId, userId);
    return rule;
  }

  async create(dto: CreateAutomationDto, userId: string) {
    await this.checkAccess(dto.companyId, userId);

    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        companyId: dto.companyId,
        projectId: dto.projectId,
        trigger: dto.trigger,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAutomationDto>, userId: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Regra não encontrada');
    await this.checkAccess(rule.companyId, userId);

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.trigger !== undefined && { trigger: dto.trigger }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions as any }),
        ...(dto.actions !== undefined && { actions: dto.actions as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId as any }),
      },
    });
  }

  async delete(id: string, userId: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Regra não encontrada');
    await this.checkAccess(rule.companyId, userId);
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async toggleActive(id: string, userId: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Regra não encontrada');
    await this.checkAccess(rule.companyId, userId);
    return this.prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }

  async getExecutions(ruleId: string, userId: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) throw new NotFoundException('Regra não encontrada');
    await this.checkAccess(rule.companyId, userId);

    return this.prisma.automationExecution.findMany({
      where: { ruleId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async checkAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
    });
    if (!m) throw new ForbiddenException('Sem acesso');
  }
}
