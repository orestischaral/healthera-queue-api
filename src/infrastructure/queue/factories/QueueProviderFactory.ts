import { Injectable } from '@nestjs/common';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { BullMqProvider } from '../providers/BullMqProvider';
import { RabbitMqProvider } from '../providers/RabbitMqProvider';

@Injectable()
export class QueueProviderFactory {
  constructor(
    private readonly bullMqProvider: BullMqProvider,
    private readonly rabbitMqProvider: RabbitMqProvider,
  ) {}

  create(providerType: string): IQueueProvider {
    switch (providerType) {
      case 'bullmq':
        return this.bullMqProvider;
      case 'rabbitmq':
        return this.rabbitMqProvider;
      default:
        throw new Error(`Unknown queue provider: ${providerType}`);
    }
  }
}
