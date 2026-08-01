import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_FIELDS = new Set([
  'senha',
  'senhaAtual',
  'novaSenha',
  'confirmarSenha',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
]);

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_FIELDS.has(key) ? '***REDACTED***' : redactSensitiveData(val),
      ]),
    );
  }

  return value;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const userInfo = user ? `User: ${user.sub}` : 'Unauthenticated';

    this.logger.log(`${method} ${url} - ${userInfo}`);

    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(redactSensitiveData(body))}`);
    }

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(
          `${method} ${url} - ${response.statusCode} - ${Date.now() - now}ms`,
        );
      }),
    );
  }
}