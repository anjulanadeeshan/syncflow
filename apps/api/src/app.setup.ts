import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
  type ValidationError,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiExceptionFilter } from './common/http/api-exception.filter.js';

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Array<{ field: string; messages: string[] }> {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const current = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [
      ...current,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}

export function configureApp(
  app: INestApplication,
  configService: ConfigService,
): void {
  const allowedOrigins = configService
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed.',
          details: flattenValidationErrors(errors),
        }),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
}
