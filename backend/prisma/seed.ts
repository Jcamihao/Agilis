import { PrismaClient, Priority, TaskStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@agilis.app' },
    update: {},
    create: {
      name: 'Admin Agilis',
      email: 'admin@agilis.app',
      password: hashedPassword,
      bio: 'Administrador da plataforma Agilis',
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: 'agilis-demo' },
    update: {},
    create: {
      name: 'Agilis Demo',
      slug: 'agilis-demo',
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: {},
    create: {
      userId: user.id,
      companyId: company.id,
      role: UserRole.OWNER,
    },
  });

  const team = await prisma.team.create({
    data: {
      name: 'Produto',
      color: '#6366f1',
      companyId: company.id,
      members: {
        create: { userId: user.id, role: UserRole.OWNER },
      },
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Agilis V1',
      description: 'Desenvolvimento da versão 1 da plataforma',
      color: '#6366f1',
      icon: 'rocket_launch',
      companyId: company.id,
      teamId: team.id,
    },
  });

  const tasks = [
    {
      title: 'Configurar autenticação JWT',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1,
    },
    {
      title: 'Implementar módulo de empresas',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 2,
    },
    {
      title: 'Criar kanban board',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      position: 1,
    },
    {
      title: 'Desenvolver dashboard',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      position: 2,
    },
    {
      title: 'Implementar drag and drop',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.MEDIUM,
      position: 1,
    },
    {
      title: 'Adicionar notificações em tempo real',
      status: TaskStatus.BACKLOG,
      priority: Priority.MEDIUM,
      position: 1,
    },
    {
      title: 'Integrar relatórios avançados',
      status: TaskStatus.BACKLOG,
      priority: Priority.LOW,
      position: 2,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        projectId: project.id,
        creatorId: user.id,
        assigneeId: user.id,
      },
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log('📧 Email: admin@agilis.app');
  console.log('🔑 Senha: Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
