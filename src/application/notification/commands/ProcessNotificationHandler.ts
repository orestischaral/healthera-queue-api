import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessNotificationCommand } from './ProcessNotificationCommand';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

@CommandHandler(ProcessNotificationCommand)
export class ProcessNotificationHandler
  implements ICommandHandler<ProcessNotificationCommand>
{
  private readonly logger = new Logger(ProcessNotificationHandler.name);

  async execute(command: ProcessNotificationCommand): Promise<void> {
    const { message } = command;
    const payload = message.payload as any;

    this.logger.log(
      `Notification received in Queue: ${payload.queue}, MessageId: ${payload.messageId}, Timestamp: ${payload.timestamp}`,
    );
  }
}
