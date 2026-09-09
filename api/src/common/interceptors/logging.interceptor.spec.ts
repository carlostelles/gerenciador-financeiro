import { Logger } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('Logging recuperação', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['solicitar-recuperacao-senha', 'redefinir-senha'])('não registra corpo, query, headers ou dados SDK em %s', async route => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    const request = { method: 'POST', url: `/auth/${route}?token=RAW-TOKEN`, body: { email: 'private@example.com', token: 'RAW-TOKEN', novaSenha: 'PRIVATE-PASS', HOSTINGER_MAIL_API_TOKEN: 'SDK-SECRET' }, headers: { authorization: 'SECRET' } };
    const context = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ statusCode: 202 }) }) } as any;
    await lastValueFrom(new LoggingInterceptor().intercept(context, { handle: () => of({ message: 'OK' }) }));
    expect(debug).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/RAW-TOKEN|SDK-SECRET|PRIVATE-PASS|private@example/);
  });
});