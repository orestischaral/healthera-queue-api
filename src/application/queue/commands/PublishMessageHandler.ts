import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { PublishMessageCommand } from './PublishMessageCommand';

@CommandHandler(PublishMessageCommand)
export class PublishMessageHandler
  implements ICommandHandler<PublishMessageCommand>
{
  constructor(private readonly queueProvider: IQueueProvider) {}

  async execute(command: PublishMessageCommand): Promise<string> {
    const message = QueueMessage.create(
      command.queueName,
      command.payload,
      command.attributes,
    );

    return this.queueProvider.publish(message);
  }
}
