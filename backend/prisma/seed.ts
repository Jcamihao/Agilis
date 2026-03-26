import {
  PrismaClient,
  Role,
  TaskLogAction,
  TaskStatus,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date;
  assignedToId: string;
  createdById: string;
  organizationId: string;
}

async function main(): Promise<void> {
  const adminEmail = 'admin@agilis.local';
  const managerEmail = 'gestor@agilis.local';
  const userEmail = 'colaborador@agilis.local';
  const organizationName = 'codeStage Solucoes';
  const password = await bcrypt.hash('Agilis@123', 10);

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  const organization = existingAdmin
    ? await prisma.organization.findUniqueOrThrow({
        where: {
          id: existingAdmin.organizationId,
        },
      })
    : await prisma.organization.create({
        data: {
          name: organizationName,
        },
      });

  const admin = existingAdmin
    ? existingAdmin
    : await prisma.user.create({
        data: {
          name: 'Administrador Agilis',
          email: adminEmail,
          password,
          role: Role.ADMIN,
          organizationId: organization.id,
        },
      });

  const manager = await upsertUser({
    email: managerEmail,
    name: 'Gestor Operacional',
    password,
    role: Role.MANAGER,
    organizationId: organization.id,
  });

  const collaborator = await upsertUser({
    email: userEmail,
    name: 'Colaborador de Execucao',
    password,
    role: Role.USER,
    organizationId: organization.id,
  });

  const existingTasksCount = await prisma.task.count({
    where: {
      organizationId: organization.id,
    },
  });

  if (existingTasksCount > 0) {
    return;
  }

  const tasksToSeed: SeedTaskInput[] = [
    {
      title: 'Revisar backlog operacional da semana',
      description: 'Validar prioridades, gargalos e tarefas em risco da operacao.',
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 18),
      assignedToId: manager.id,
      createdById: admin.id,
      organizationId: organization.id,
    },
    {
      title: 'Cobrar cliente sobre aprovacao pendente',
      description: 'Entrar em contato com o cliente e registrar retorno no fluxo.',
      status: TaskStatus.PENDING,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 8),
      assignedToId: collaborator.id,
      createdById: manager.id,
      organizationId: organization.id,
    },
    {
      title: 'Atualizar indicadores do dashboard executivo',
      description: 'Consolidar os dados finais para a reuniao da manha.',
      status: TaskStatus.DONE,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
      assignedToId: collaborator.id,
      createdById: admin.id,
      organizationId: organization.id,
    },
    {
      title: 'Renegociar prazo da entrega atrasada',
      description: 'Tarefa deliberadamente vencida para demonstrar o cron automatico.',
      status: TaskStatus.DELAYED,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 30),
      assignedToId: manager.id,
      createdById: admin.id,
      organizationId: organization.id,
    },
  ];

  for (const taskInput of tasksToSeed) {
    const task = await prisma.task.create({
      data: taskInput,
    });

    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        organizationId: taskInput.organizationId,
        action: TaskLogAction.CREATED,
        description: 'Tarefa criada pelo seed inicial.',
        toStatus: task.status,
        performedById: taskInput.createdById,
      },
    });

    if (task.status === TaskStatus.DONE) {
      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          organizationId: taskInput.organizationId,
          action: TaskLogAction.STATUS_CHANGED,
          description: 'Tarefa concluida e mantida como exemplo no ambiente demo.',
          fromStatus: TaskStatus.IN_PROGRESS,
          toStatus: TaskStatus.DONE,
          performedById: collaborator.id,
        },
      });
    }

    if (task.status === TaskStatus.DELAYED) {
      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          organizationId: taskInput.organizationId,
          action: TaskLogAction.AUTO_DELAYED,
          description: 'Exemplo de tarefa atrasada no ambiente demo.',
          fromStatus: TaskStatus.IN_PROGRESS,
          toStatus: TaskStatus.DELAYED,
        },
      });

      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          organizationId: taskInput.organizationId,
          action: TaskLogAction.AUTO_REMINDER_SENT,
          description:
            'Cobranca automatica enviada no seed para demonstrar o assistente operacional.',
        },
      });

      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          organizationId: taskInput.organizationId,
          action: TaskLogAction.AUTO_ESCALATED,
          description:
            'Escalonamento automatico criado no seed para demonstrar a central de cobrancas.',
        },
      });
    }

    if (task.status === TaskStatus.PENDING) {
      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          organizationId: taskInput.organizationId,
          action: TaskLogAction.AUTO_REMINDER_SENT,
          description:
            'Exemplo de cobranca automatica preventiva para tarefa perto do prazo.',
        },
      });
    }
  }
}

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  organizationId: string;
}): Promise<User> {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
