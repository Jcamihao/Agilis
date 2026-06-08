import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProcessStepType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

interface ProcessStepInput {
  title: string;
  description?: string;
  type: ProcessStepType;
  order?: number;
  content?: any;
  isRequired?: boolean;
  estimatedMin?: number;
  checklistItems?: { label: string; isRequired?: boolean; order?: number }[];
}

interface CreateProcessInput {
  companyId: string;
  name: string;
  description?: string;
  teamId?: string;
  status?: any;
  icon?: string;
  color?: string;
  steps?: ProcessStepInput[];
}

@Injectable()
export class ProcessCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  list(companyId: string) {
    return this.prisma.process.findMany({
      where: { companyId },
      include: {
        _count: { select: { steps: true, instances: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  get(id: string) {
    return this.prisma.process.findUnique({
      where: { id },
      include: {
        steps: {
          include: { checklistItems: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        instances: {
          include: { steps: { include: { step: true, answers: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  create(input: CreateProcessInput, userId: string) {
    return this.prisma.process.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        description: input.description,
        teamId: input.teamId,
        status: input.status ?? 'DRAFT',
        icon: input.icon ?? 'account_tree',
        color: input.color ?? '#6366f1',
        createdById: userId,
        steps: {
          create: (input.steps ?? this.defaultSteps()).map((step, index) => ({
            title: step.title,
            description: step.description,
            type: step.type,
            order: step.order ?? index,
            content: step.content as Prisma.InputJsonValue,
            isRequired: step.isRequired ?? true,
            estimatedMin: step.estimatedMin,
            checklistItems: {
              create: (step.checklistItems ?? []).map((item, itemIndex) => ({
                label: item.label,
                isRequired: item.isRequired ?? false,
                order: item.order ?? itemIndex,
              })),
            },
          })),
        },
      },
      include: {
        steps: { include: { checklistItems: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async update(id: string, input: Partial<CreateProcessInput>) {
    const current = await this.prisma.process.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Processo não encontrado');

    return this.prisma.process.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        teamId: input.teamId,
        status: input.status,
        icon: input.icon,
        color: input.color,
        version: { increment: input.steps?.length ? 1 : 0 },
      },
      include: { steps: { include: { checklistItems: true }, orderBy: { order: 'asc' } } },
    });
  }

  async start(processId: string, userId: string) {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { steps: { include: { checklistItems: true } } },
    });
    if (!process) throw new NotFoundException('Processo não encontrado');

    return this.prisma.processInstance.create({
      data: {
        processId,
        triggeredById: userId,
        steps: {
          create: process.steps.map((step) => ({
            stepId: step.id,
            status: 'PENDING',
            answers: {
              create: step.checklistItems.map((item) => ({
                itemId: item.id,
                isChecked: false,
              })),
            },
          })),
        },
      },
      include: { steps: { include: { step: true, answers: true } } },
    });
  }

  async updateInstanceStep(
    instanceStepId: string,
    input: { status?: string; notes?: string; answers?: { itemId: string; isChecked: boolean }[] },
    userId: string,
  ) {
    const step = await this.prisma.processInstanceStep.findUnique({
      where: { id: instanceStepId },
      include: { instance: true },
    });
    if (!step) throw new NotFoundException('Etapa não encontrada');

    for (const answer of input.answers ?? []) {
      await this.prisma.checklistItemAnswer.upsert({
        where: { instanceStepId_itemId: { instanceStepId, itemId: answer.itemId } },
        update: { isChecked: answer.isChecked },
        create: { instanceStepId, itemId: answer.itemId, isChecked: answer.isChecked },
      });
    }

    const updated = await this.prisma.processInstanceStep.update({
      where: { id: instanceStepId },
      data: {
        status: input.status ?? 'DONE',
        notes: input.notes,
        completedAt: input.status === 'DONE' || !input.status ? new Date() : undefined,
        completedBy: userId,
      },
      include: { step: true, answers: true },
    });

    const pending = await this.prisma.processInstanceStep.count({
      where: { instanceId: step.instanceId, status: { notIn: ['DONE', 'SKIPPED'] } },
    });
    if (pending === 0) {
      const instance = await this.prisma.processInstance.update({
        where: { id: step.instanceId },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { process: { select: { id: true, name: true, companyId: true } } },
      });
      this.events.emit('process.completed', {
        processId: instance.process.id,
        processName: instance.process.name,
        instanceId: instance.id,
        companyId: instance.process.companyId,
      });
    }
    return updated;
  }

  private defaultSteps(): ProcessStepInput[] {
    return [
      { title: 'Documentação', type: 'DOCUMENTATION', content: { markdown: '' } },
      { title: 'Checklist', type: 'CHECKLIST', checklistItems: [{ label: 'Validar pré-requisitos', isRequired: true }] },
      { title: 'Tarefas', type: 'TASK', content: { taskTemplate: true } },
      { title: 'Automações', type: 'APPROVAL', content: { automationRuleIds: [] }, isRequired: false },
    ];
  }
}
