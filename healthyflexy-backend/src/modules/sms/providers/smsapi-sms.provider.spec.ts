import { ConfigService } from '@nestjs/config';
import { describeSmsError } from '../sms-error';
import { SmsapiSmsProvider } from './smsapi-sms.provider';

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('SmsapiSmsProvider', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('шле POST /sms.do з Bearer-токеном, номером без «+», UTF-8 і відправником', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ count: 1, list: [{ id: '123', status: 'QUEUE', points: 0.036 }] }),
        {
          status: 200,
        },
      ),
    );
    global.fetch = fetchMock as typeof fetch;
    const provider = new SmsapiSmsProvider(
      config({
        SMSAPI_TOKEN: 'tok',
        SMSAPI_SENDER: 'Turbota',
        SMSAPI_URL: 'https://api.smsapi.com/',
      }) as never,
    );
    const result = await provider.send('+48501234567', 'Книжка турботи: ваш код 123456. Діє 5 хв.');
    expect(result).toEqual({ id: '123', status: 'QUEUE' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.smsapi.com/sms.do');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const body = new URLSearchParams(init.body as string);
    expect(body.get('to')).toBe('48501234567');
    expect(body.get('from')).toBe('Turbota');
    expect(body.get('encoding')).toBe('utf-8');
    expect(body.get('format')).toBe('json');
    expect(body.get('message')).toContain('123456');
  });

  it('без відправника поле from не передається (ім’я за замовчуванням акаунта)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ count: 1, list: [{ id: '1' }] }), { status: 200 }),
      );
    global.fetch = fetchMock as typeof fetch;
    await new SmsapiSmsProvider(
      config({ SMSAPI_TOKEN: 't', SMSAPI_URL: 'https://api.smsapi.com' }) as never,
    ).send('+380501234567', 'x');
    const body = new URLSearchParams(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.has('from')).toBe(false);
    expect(body.get('to')).toBe('380501234567');
  });

  it('помилка SMSAPI (навіть з HTTP 200) кидається з кодом і підказкою', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 103, message: 'Not enough credits' }), {
        status: 200,
      }),
    ) as typeof fetch;
    const provider = new SmsapiSmsProvider(
      config({ SMSAPI_TOKEN: 't', SMSAPI_URL: 'https://api.smsapi.com' }) as never,
    );
    const error = await provider.send('+48501234567', 'x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(describeSmsError('smsapi', error)).toMatchObject({
      code: 'smsapi_103',
      hint: expect.stringContaining('поповніть') as unknown,
    });
  });

  it('без токена — зрозуміла помилка конфігурації', async () => {
    const error = await new SmsapiSmsProvider(
      config({ SMSAPI_URL: 'https://api.smsapi.com' }) as never,
    )
      .send('+48501234567', 'x')
      .catch((e: unknown) => e);
    expect(describeSmsError('smsapi', error).hint).toContain('SMSAPI_TOKEN');
  });
});
