import { ICommand } from '@nestjs/cqrs';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

export class ProcessNotificationCommand implements ICommand {
  constructor(public readonly message: QueueMessage) {}
}
