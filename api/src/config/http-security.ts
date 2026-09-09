import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { isIP } from 'net';

export function configureHttpSecurity(
  app: NestExpressApplication,
  trusted = '',
): void {
  const proxies = trusted
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const proxy of proxies) {
    const [address, prefix, extra] = proxy.split('/');
    const family = isIP(address);
    if (
      !family ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) <= 0 ||
          Number(prefix) > (family === 4 ? 32 : 128)))
    ) {
      throw new Error(
        'TRUSTED_PROXY_CIDRS deve conter somente IPs/CIDRs explícitos, nunca confiança global',
      );
    }
  }
  // Express resolves the nearest untrusted hop, not arbitrary req.headers values.
  app.set('trust proxy', proxies.length ? proxies : false);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (
      /^\/auth\/(solicitar-recuperacao-senha|redefinir-senha)\/?$/i.test(
        request.path,
      )
    ) {
      // Middleware covers errors from validation/guards too, unlike @Header alone.
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
    }
    next();
  });
}
