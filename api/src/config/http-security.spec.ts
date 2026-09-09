import { configureHttpSecurity } from './http-security';

describe('proxy explícito e seguro', () => {
  const app = { set: jest.fn(), use: jest.fn() };
  it.each([
    'true',
    '1',
    '0.0.0.0/0',
    '::/0',
    'loopback',
    'example.com',
    '10.0.0.1/99',
  ])('rejeita confiança ampla/inválida %s', (value) => {
    expect(() => configureHttpSecurity(app as any, value)).toThrow();
  });
  it('não confia por padrão e aceita IP/CIDR explícito', () => {
    configureHttpSecurity(app as any, '');
    expect(app.set).toHaveBeenLastCalledWith('trust proxy', false);
    configureHttpSecurity(app as any, '127.0.0.1/32,::1/128');
    expect(app.set).toHaveBeenLastCalledWith('trust proxy', [
      '127.0.0.1/32',
      '::1/128',
    ]);
  });
});
