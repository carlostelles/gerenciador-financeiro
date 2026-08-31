import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const EspacoId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number | undefined => {
    const request = context.switchToHttp().getRequest();
    const value = request.query?.espacoId ?? request.headers?.['x-espaco-id'];
    if (value === undefined || value === '') {
      return undefined;
    }
    const espacoId = Number(value);
    if (!Number.isInteger(espacoId) || espacoId <= 0) {
      throw new BadRequestException(
        'O espacoId deve ser um número inteiro positivo',
      );
    }
    return espacoId;
  },
);
