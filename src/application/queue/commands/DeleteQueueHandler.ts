import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteQueueCommand } from './DeleteQueueCommand';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

@CommandHandler(DeleteQueueCommand)
export class DeleteQueueHandler implements ICommandHandler<DeleteQueueCommand> {
  constructor(private readonly queueProvider: IQueueProvider) {}

  async execute(command: DeleteQueueCommand): Promise<void> {
    return this.queueProvider.deleteQueue(command.queueName);
  }
}
