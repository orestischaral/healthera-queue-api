import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AcknowledgeMessageCommand } from './AcknowledgeMessageCommand';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

@CommandHandler(AcknowledgeMessageCommand)
export class AcknowledgeMessageHandler
  implements ICommandHandler<AcknowledgeMessageCommand>
{
  constructor(private readonly queueProvider: IQueueProvider) {}

  async execute(command: AcknowledgeMessageCommand): Promise<void> {
    await this.queueProvider.acknowledge(
      command.queueName,
      command.receiptHandle,
    );
  }
}
