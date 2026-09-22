import { SelahAiClientService, SelahAiError } from './selah-ai-client.service';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as any;

const configured = {
  SELAH_IA_BASE_URL: 'http://selah.test/',
  SELAH_IA_API_KEY: 'chave-do-agilis',
};

const withHttp = (service: SelahAiClientService, post: jest.Mock) => {
  (service as any).http = { post };
  return service;
};

describe('SelahAiClientService', () => {
  it('sends the app key and source app to the Agilis adapter route', async () => {
    const post = jest.fn().mockResolvedValue({ data: { answer: 'ola' } });
    const service = withHttp(new SelahAiClientService(config(configured)), post);

    const answer = await service.chat({ message: 'oi', history: [], workspace: {} as any });

    expect(answer).toBe('ola');
    const [url, payload, options] = post.mock.calls[0];
    expect(url).toBe('http://selah.test/v1/adapters/agilis/workspace/chat');
    expect(payload.message).toBe('oi');
    expect(options.headers['X-Selah-Api-Key']).toBe('chave-do-agilis');
    expect(options.headers['X-Source-App']).toBe('AgilisBack');
    expect(options.headers['X-Request-Id']).toBeTruthy();
  });

  it('unwraps each capability from the Selah response', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce({ data: { summary: 'resumo' } })
      .mockResolvedValueOnce({ data: { plan: { immediatePriorities: ['a'] } } })
      .mockResolvedValueOnce({ data: { suggestions: [{ name: 'Ana', reason: 'x' }] } })
      .mockResolvedValueOnce({ data: { brief: { summary: 'b' } } });
    const service = withHttp(new SelahAiClientService(config(configured)), post);

    expect(await service.summarizeProject({} as any)).toBe('resumo');
    expect((await service.actionPlan({} as any)).immediatePriorities).toEqual(['a']);
    expect(await service.suggestAssignee({} as any)).toEqual([{ name: 'Ana', reason: 'x' }]);
    expect((await service.strategicBrief({} as any)).summary).toBe('b');
    expect(post.mock.calls[1][0]).toContain('/action-plan');
  });

  it('fails clearly, without calling the network, when Selah is not configured', async () => {
    const post = jest.fn();
    const service = withHttp(new SelahAiClientService(config({})), post);

    await expect(service.chat({} as any)).rejects.toMatchObject({ status: 0 });
    expect(post).not.toHaveBeenCalled();
  });

  it('exposes the rate limit wait time from a 429', async () => {
    const post = jest.fn().mockRejectedValue({
      message: 'x',
      response: { status: 429, data: { message: 'Rate limit exceeded', retryAfterSeconds: 12.2 }, headers: {} },
    });
    const service = withHttp(new SelahAiClientService(config(configured)), post);

    const error = await service.chat({} as any).catch((e) => e);

    expect(error).toBeInstanceOf(SelahAiError);
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(13);
  });

  it('falls back to the Retry-After header and wraps network errors', async () => {
    const withHeader = withHttp(
      new SelahAiClientService(config(configured)),
      jest.fn().mockRejectedValue({ response: { status: 429, data: {}, headers: { 'retry-after': '7' } } }),
    );
    expect((await withHeader.chat({} as any).catch((e) => e)).retryAfterSeconds).toBe(7);

    const offline = withHttp(
      new SelahAiClientService(config(configured)),
      jest.fn().mockRejectedValue({ message: 'connect ECONNREFUSED' }),
    );
    const error = await offline.chat({} as any).catch((e) => e);
    expect(error.status).toBe(0);
    expect(error.message).toContain('ECONNREFUSED');
  });
});
