import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProjectDto } from './update-project.dto';

// Mesmas opções do ValidationPipe global (main.ts).
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const validate = (body: object) => pipe.transform(body, { type: 'body', metatype: UpdateProjectDto });

describe('UpdateProjectDto', () => {
  it('accepts what the project edit forms send, without companyId', async () => {
    const body = { name: 'Agilis V1', color: '#6366f1', icon: 'rocket_launch', description: 'Versão 1' };

    await expect(validate(body)).resolves.toMatchObject(body);
  });

  it('accepts a partial update', async () => {
    await expect(validate({ color: '#ef4444' })).resolves.toMatchObject({ color: '#ef4444' });
  });

  it('still rejects an empty name', async () => {
    await expect(validate({ name: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects companyId, so a project cannot be moved to another company', async () => {
    await expect(validate({ name: 'x', companyId: '8c1c7a0e-2d8b-4c0e-9f43-2f6f5f1a9b11' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
