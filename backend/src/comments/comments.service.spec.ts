import { CommentsService } from './comments.service';
import { EVENTS } from '../events/agilis-events';

const buildService = () => {
  const task = {
    id: 't1', title: 'Tarefa', assigneeId: 'u-assignee', creatorId: 'u-creator',
    project: { companyId: 'c1' },
  };
  const author = { id: 'u-author', name: 'Ana', email: 'ana@x.com' };
  const comment = { id: 'cm1', content: 'oi', taskId: 't1', authorId: 'u-author' };
  const prisma: any = {
    task: { findUnique: jest.fn().mockResolvedValue(task) },
    userCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'm' }) },
    user: { findUnique: jest.fn().mockResolvedValue(author), findMany: jest.fn().mockResolvedValue([]) },
    comment: { create: jest.fn().mockResolvedValue(comment) },
    activity: { create: jest.fn().mockResolvedValue({}) },
  };
  const notifications: any = { notifyComment: jest.fn().mockResolvedValue({}), notifyMention: jest.fn() };
  const events: any = { emit: jest.fn() };
  return { service: new CommentsService(prisma, notifications, events), notifications, events, task, author, comment };
};

describe('CommentsService.create', () => {
  it('emits COMMENT_CREATED once so comment automations can fire', async () => {
    const { service, events, task, author, comment } = buildService();

    await service.create({ taskId: 't1', content: 'oi' } as any, 'u-author');

    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(EVENTS.COMMENT_CREATED, {
      comment, task, actor: author, companyId: 'c1',
    });
  });

  it('notifies the assignee and the creator exactly once each (no duplicate from the event listener)', async () => {
    const { service, notifications } = buildService();

    await service.create({ taskId: 't1', content: 'oi' } as any, 'u-author');

    const recipients = notifications.notifyComment.mock.calls.map((c: any[]) => c[1]).sort();
    expect(recipients).toEqual(['u-assignee', 'u-creator']);
  });
});
