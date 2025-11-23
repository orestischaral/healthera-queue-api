import { Injectable } from '@nestjs/common';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { BullMqProvider } from '../providers/BullMqProvider';
import { RabbitMqProvider } from '../providers/RabbitMqProvider';
import {
  CompositeQueueProvider,
  QueueRouting,
} from '../providers/CompositeQueueProvider';

@Injectable()
export class QueueProviderFactory {
  constructor(
    private readonly bullMqProvider: BullMqProvider,
    private readonly rabbitMqProvider: RabbitMqProvider,
  ) {}

  create(providerType: string, routing?: QueueRouting): IQueueProvider {
    switch (providerType) {
      case 'bullmq':
        return this.bullMqProvider;
      case 'rabbitmq':
        return this.rabbitMqProvider;
      case 'both':
        return new CompositeQueueProvider(
          this.bullMqProvider,
          this.rabbitMqProvider,
          routing || { '*': 'both' }, // All queues use both providers
        );
      default:
        throw new Error(`Unknown queue provider: ${providerType}`);
    }
  }
}
