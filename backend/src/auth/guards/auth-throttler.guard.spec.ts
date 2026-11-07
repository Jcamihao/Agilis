import { Body, Controller, INestApplication, Module, Post, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import { AuthThrottlerGuard } from './auth-throttler.guard';

@Controller('auth')
class FakeAuthController {
  @Post('login')
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  login(@Body() _body: unknown) {
    return { ok: true };
  }

  @Post('register')
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  register(@Body() _body: unknown) {
    return { ok: true };
  }
}

@Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])], controllers: [FakeAuthController] })
class FakeModule {}

describe('AuthThrottlerGuard', () => {
  let app: INestApplication;
  let base: string;

  const call = (path: string, body: object) =>
    fetch(`${base}/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const post = async (path: string, body: object) => (await call(path, body)).status;

  beforeAll(async () => {
    app = await NestFactory.create(FakeModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(() => app.close());

  it('blocks the 4th login attempt for the same email and counts email case-insensitively', async () => {
    const results = [];
    for (const email of ['a@x.com', 'A@x.com ', 'a@x.com', 'A@X.COM']) results.push(await post('login', { email }));

    expect(results).toEqual([201, 201, 201, 429]);
  });

  it('answers a blocked login with a readable message in Portuguese', async () => {
    const res = await call('login', { email: 'a@x.com' });

    expect(res.status).toBe(429);
    expect((await res.json()).message).toBe('Muitas tentativas. Aguarde um minuto e tente de novo.');
  });

  it('does not block another email that comes from the same IP', async () => {
    expect(await post('login', { email: 'outra@x.com' })).toBe(201);
  });

  it('limits register per IP regardless of the email sent', async () => {
    const results = [];
    for (const email of ['1@x.com', '2@x.com', '3@x.com']) results.push(await post('register', { email }));

    expect(results).toEqual([201, 201, 429]);
  });
});
