import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateQueueCommand } from './CreateQueueCommand';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

@CommandHandler(CreateQueueCommand)
export class CreateQueueHandler implements ICommandHandler<CreateQueueCommand> {
  constructor(private readonly queueProvider: IQueueProvider) {}

  async execute(command: CreateQueueCommand): Promise<string> {
    return this.queueProvider.createQueue(command.queueName);
  }
}
