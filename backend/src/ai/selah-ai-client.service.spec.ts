import { SelahAiClientService, SelahAiError } from './selah-ai-client.service';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as any;

const configured = {
  SELAH_IA_BASE_URL: 'http://selah.test/',
  SELAH_IA_API_KEY: 'chave-do-agilis',
};

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('SelahAiClientService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('sends the app key and source app to the Agilis adapter route', async () => {
    fetchMock.mockResolvedValue(reply({ answer: 'ola' }));
    const service = new SelahAiClientService(config(configured));

    const answer = await service.chat({ message: 'oi', history: [], workspace: {} as any });

    expect(answer).toBe('ola');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://selah.test/v1/adapters/agilis/workspace/chat');
    expect(JSON.parse(options.body).message).toBe('oi');
    expect(options.headers['X-Selah-Api-Key']).toBe('chave-do-agilis');
    expect(options.headers['X-Source-App']).toBe('AgilisBack');
    expect(options.headers['X-Request-Id']).toBeTruthy();
  });

  it('unwraps each capability from the Selah response', async () => {
    fetchMock
      .mockResolvedValueOnce(reply({ summary: 'resumo' }))
      .mockResolvedValueOnce(reply({ plan: { immediatePriorities: ['a'] } }))
      .mockResolvedValueOnce(reply({ brief: { summary: 'b' } }));
    const service = new SelahAiClientService(config(configured));

    expect(await service.summarizeProject({} as any)).toBe('resumo');
    expect((await service.actionPlan({} as any)).immediatePriorities).toEqual(['a']);
    expect((await service.strategicBrief({} as any)).summary).toBe('b');
    expect(fetchMock.mock.calls[1][0]).toContain('/action-plan');
  });

  it('fails clearly, without calling the network, when Selah is not configured', async () => {
    const service = new SelahAiClientService(config({}));

    await expect(service.chat({} as any)).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes the rate limit wait time from a 429', async () => {
    fetchMock.mockResolvedValue(reply({ message: 'Rate limit exceeded', retryAfterSeconds: 12.2 }, 429));
    const service = new SelahAiClientService(config(configured));

    const error = await service.chat({} as any).catch((e) => e);

    expect(error).toBeInstanceOf(SelahAiError);
    expect(error.status).toBe(429);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.retryAfterSeconds).toBe(13);
  });

  it('falls back to the Retry-After header, keeps non-JSON errors and wraps network errors', async () => {
    const service = new SelahAiClientService(config(configured));

    fetchMock.mockResolvedValueOnce(reply({}, 429, { 'Retry-After': '7' }));
    expect((await service.chat({} as any).catch((e) => e)).retryAfterSeconds).toBe(7);

    fetchMock.mockResolvedValueOnce(new Response('<html>boom</html>', { status: 500, statusText: 'Internal Server Error' }));
    const upstream = await service.chat({} as any).catch((e) => e);
    expect(upstream.status).toBe(500);
    expect(upstream.retryAfterSeconds).toBeUndefined();

    fetchMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const offline = await service.chat({} as any).catch((e) => e);
    expect(offline.status).toBe(0);
    expect(offline.message).toContain('ECONNREFUSED');
  });
});
