import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

type ErrorPayload = {
  code?: string;
  message?: string | string[];
  details?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const response =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload: ErrorPayload =
      typeof response === 'object' && response !== null
        ? (response as ErrorPayload)
        : { message: typeof response === 'string' ? response : undefined };
    const fallbackMessage =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An unexpected error occurred.'
        : 'Request failed.';

    httpAdapter.reply(
      context.getResponse(),
      {
        statusCode: status,
        code: payload.code ?? `HTTP_${status}`,
        message: Array.isArray(payload.message)
          ? payload.message.join(', ')
          : (payload.message ?? fallbackMessage),
        ...(payload.details === undefined ? {} : { details: payload.details }),
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(context.getRequest()),
      },
      status,
    );
  }
}
