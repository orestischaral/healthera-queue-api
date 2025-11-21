import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { ReceiveMessagesQuery } from './ReceiveMessagesQuery';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

@QueryHandler(ReceiveMessagesQuery)
export class ReceiveMessagesHandler
  implements IQueryHandler<ReceiveMessagesQuery>
{
  constructor(private readonly queueProvider: IQueueProvider) {}

  async execute(query: ReceiveMessagesQuery): Promise<QueueMessage[]> {
    return this.queueProvider.receive(query.queueName, query.maxMessages);
  }
}
