import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueueNotFoundException } from '@domain/queue/exceptions/QueueNotFoundException';
import { MessagePublishFailedException } from '@domain/queue/exceptions/MessagePublishFailedException';

@Catch(QueueNotFoundException, MessagePublishFailedException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof QueueNotFoundException) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof MessagePublishFailedException) {
      status = HttpStatus.BAD_REQUEST;
    }

    this.logger.error(`${exception.name}: ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
