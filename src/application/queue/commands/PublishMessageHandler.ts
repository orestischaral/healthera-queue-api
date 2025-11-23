import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { PublishMessageCommand } from './PublishMessageCommand';
import { INotificationService } from '@domain/notification/interfaces/INotificationService';

@CommandHandler(PublishMessageCommand)
export class PublishMessageHandler
  implements ICommandHandler<PublishMessageCommand>
{
  constructor(
    private readonly queueProvider: IQueueProvider,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(command: PublishMessageCommand): Promise<string> {
    const message = QueueMessage.create(
      command.queueName,
      command.payload,
      command.attributes,
    );
    const messageId = await this.queueProvider.publish(message);
    await this.notificationService.notifyMessagePublished(
      command.queueName,
      messageId,
    );

    return messageId;
  }
}
