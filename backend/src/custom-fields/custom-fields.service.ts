import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomFieldType } from '@prisma/client';

export class CreateFieldDto {
  name: string;
  type: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  position?: number;
}

export class UpdateFieldDto {
  name?: string;
  options?: string[];
  isRequired?: boolean;
  position?: number;
}

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Field definitions ──────────────────────────────────────────────────────

  listByProject(projectId: string) {
    return this.prisma.customField.findMany({
      where:   { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async createField(projectId: string, dto: CreateFieldDto) {
    const max = await this.prisma.customField.aggregate({
      where:   { projectId },
      _max:    { position: true },
    });
    return this.prisma.customField.create({
      data: {
        projectId,
        name:       dto.name,
        type:       dto.type,
        options:    dto.options ?? [],
        isRequired: dto.isRequired ?? false,
        position:   dto.position ?? (max._max.position ?? -1) + 1,
      },
    });
  }

  async updateField(id: string, dto: UpdateFieldDto) {
    const field = await this.prisma.customField.findUnique({ where: { id } });
    if (!field) throw new NotFoundException();
    return this.prisma.customField.update({
      where: { id },
      data: {
        ...(dto.name       !== undefined && { name:       dto.name }),
        ...(dto.options    !== undefined && { options:    dto.options }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.position   !== undefined && { position:   dto.position }),
      },
    });
  }

  deleteField(id: string) {
    return this.prisma.customField.delete({ where: { id } });
  }

  async reorder(projectId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, i) =>
        this.prisma.customField.update({ where: { id }, data: { position: i } }),
      ),
    );
    return this.listByProject(projectId);
  }

  // ── Values ─────────────────────────────────────────────────────────────────

  getTaskValues(taskId: string) {
    return this.prisma.customFieldValue.findMany({
      where:   { taskId },
      include: { customField: true },
    });
  }

  async setValues(taskId: string, values: { customFieldId: string; value: string | null }[]) {
    await Promise.all(
      values.map(({ customFieldId, value }) =>
        this.prisma.customFieldValue.upsert({
          where:  { customFieldId_taskId: { customFieldId, taskId } },
          update: { value: value ?? null },
          create: { customFieldId, taskId, value: value ?? null },
        }),
      ),
    );
    return this.getTaskValues(taskId);
  }

  async setValue(taskId: string, customFieldId: string, value: string | null) {
    return this.prisma.customFieldValue.upsert({
      where:  { customFieldId_taskId: { customFieldId, taskId } },
      update: { value: value ?? null },
      create: { customFieldId, taskId, value: value ?? null },
    });
  }

  // ── Include helper — used by TasksService ─────────────────────────────────

  async enrichTasks(tasks: any[], projectId: string) {
    const fields = await this.listByProject(projectId);
    if (!fields.length) return tasks.map(t => ({ ...t, customFields: [] }));

    const taskIds = tasks.map(t => t.id);
    const allValues = await this.prisma.customFieldValue.findMany({
      where: { taskId: { in: taskIds } },
    });

    const valueMap = new Map<string, Map<string, string | null>>();
    for (const v of allValues) {
      if (!valueMap.has(v.taskId)) valueMap.set(v.taskId, new Map());
      valueMap.get(v.taskId)!.set(v.customFieldId, v.value);
    }

    return tasks.map(task => ({
      ...task,
      customFields: fields.map(f => ({
        fieldId:   f.id,
        fieldName: f.name,
        fieldType: f.type,
        options:   f.options,
        value:     valueMap.get(task.id)?.get(f.id) ?? null,
      })),
    }));
  }
}
