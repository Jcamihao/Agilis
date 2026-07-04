import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntakeFormStatus, IntakeSubmissionStatus, Priority, TaskStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface IntakeFieldDef {
  id: string;
  type: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  mapsTo?: 'title' | 'description' | 'priority' | 'dueDate' | 'assigneeId' | null;
}

export class CreateFormDto {
  title: string;
  description?: string;
  fields?: IntakeFieldDef[];
  submitLabel?: string;
  successMsg?: string;
}

export class UpdateFormDto {
  title?: string;
  description?: string;
  status?: IntakeFormStatus;
  fields?: IntakeFieldDef[];
  submitLabel?: string;
  successMsg?: string;
}

export class SubmitFormDto {
  data: Record<string, any>;
  submitterEmail?: string;
}

function slugify(text: string, suffix: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) + '-' + suffix;
}

@Injectable()
export class IntakeService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Form management ────────────────────────────────────────────────────────

  listByProject(projectId: string) {
    return this.prisma.intakeForm.findMany({
      where:   { projectId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForm(id: string) {
    const form = await this.prisma.intakeForm.findUnique({
      where:   { id },
      include: {
        createdBy:   { select: { id: true, name: true } },
        submissions: { orderBy: { submittedAt: 'desc' }, take: 50,
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException();
    return form;
  }

  async createForm(projectId: string, userId: string, dto: CreateFormDto) {
    const suffix = randomBytes(3).toString('hex');
    const slug   = slugify(dto.title, suffix);
    return this.prisma.intakeForm.create({
      data: {
        projectId,
        slug,
        title:       dto.title,
        description: dto.description,
        fields:      (dto.fields ?? this.defaultFields()) as any,
        submitLabel: dto.submitLabel ?? 'Enviar',
        successMsg:  dto.successMsg  ?? 'Sua solicitação foi recebida. Obrigado!',
        createdById: userId,
      },
    });
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    const form = await this.prisma.intakeForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException();
    return this.prisma.intakeForm.update({ where: { id }, data: dto as any });
  }

  deleteForm(id: string) { return this.prisma.intakeForm.delete({ where: { id } }); }

  // ── Public submission ──────────────────────────────────────────────────────

  async getPublicForm(slug: string) {
    const form = await this.prisma.intakeForm.findUnique({ where: { slug } });
    if (!form) throw new NotFoundException('Formulário não encontrado');
    if (form.status !== 'PUBLISHED') throw new BadRequestException('Este formulário não está disponível');
    return { id: form.id, title: form.title, description: form.description,
             fields: form.fields, submitLabel: form.submitLabel, successMsg: form.successMsg };
  }

  async submit(slug: string, dto: SubmitFormDto) {
    const form = await this.prisma.intakeForm.findUnique({ where: { slug } });
    if (!form) throw new NotFoundException();
    if (form.status !== 'PUBLISHED') throw new BadRequestException('Formulário fechado');

    const fields = form.fields as unknown as IntakeFieldDef[];

    // Validate required fields
    for (const f of fields) {
      if (f.required && !dto.data[f.id]) {
        throw new BadRequestException(`Campo "${f.label}" é obrigatório`);
      }
    }

    // Extract mapped fields for task creation
    let title       = `Solicitação — ${new Date().toLocaleDateString('pt-BR')}`;
    let description = '';
    let dueDate: Date | undefined;
    let priority: Priority = 'MEDIUM';

    for (const f of fields) {
      const val = dto.data[f.id];
      if (!val) continue;
      if (f.mapsTo === 'title')       title       = String(val);
      if (f.mapsTo === 'description') description = String(val);
      if (f.mapsTo === 'dueDate')     dueDate     = new Date(val);
      if (f.mapsTo === 'priority')    priority    = val as Priority;
    }

    // Find a default system user (createdBy) — use form creator
    const task = await this.prisma.task.create({
      data: {
        title,
        description: description || JSON.stringify(dto.data, null, 2),
        status:    'BACKLOG' as TaskStatus,
        priority,
        projectId: form.projectId,
        dueDate,
        creatorId: form.createdById,
      },
    });

    const submission = await this.prisma.intakeSubmission.create({
      data: {
        formId:         form.id,
        data:           dto.data,
        status:         'CONVERTED' as IntakeSubmissionStatus,
        taskId:         task.id,
        submitterEmail: dto.submitterEmail,
      },
    });

    return { submission, task: { id: task.id, title: task.title }, successMsg: form.successMsg };
  }

  // ── Submission management ─────────────────────────────────────────────────

  listSubmissions(formId: string) {
    return this.prisma.intakeSubmission.findMany({
      where:   { formId },
      include: { task: { select: { id: true, title: true, status: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  updateSubmissionStatus(id: string, status: IntakeSubmissionStatus) {
    return this.prisma.intakeSubmission.update({ where: { id }, data: { status } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private defaultFields(): IntakeFieldDef[] {
    return [
      { id: 'f1', type: 'TEXT',     label: 'Título da Solicitação', required: true,  mapsTo: 'title',       placeholder: 'Descreva brevemente sua solicitação' },
      { id: 'f2', type: 'TEXTAREA', label: 'Descrição',             required: false, mapsTo: 'description', placeholder: 'Detalhes adicionais…' },
      { id: 'f3', type: 'EMAIL',    label: 'Seu e-mail',            required: false, mapsTo: null,          placeholder: 'email@exemplo.com' },
      { id: 'f4', type: 'SELECT',   label: 'Prioridade',            required: false, mapsTo: 'priority',
        options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    ];
  }
}
