import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { BullMqProvider } from './providers/BullMqProvider';
import { RabbitMqProvider } from './providers/RabbitMqProvider';
import { QueueProviderFactory } from './factories/QueueProviderFactory';
import { QueueRouting } from './providers/CompositeQueueProvider';

@Module({})
export class QueueModule {
  static forRootAsync(): DynamicModule {
    return {
      module: QueueModule,
      providers: [
        BullMqProvider,
        RabbitMqProvider,
        QueueProviderFactory,
        {
          provide: IQueueProvider,
          useFactory: (
            factory: QueueProviderFactory,
            config: ConfigService,
          ) => {
            const providerType = config.get<string>('queueProvider', 'bullmq');
            const routing = config.get<QueueRouting>('queueRouting');

            return factory.create(providerType, routing);
          },
          inject: [QueueProviderFactory, ConfigService],
        },
      ],
      exports: [IQueueProvider],
    };
  }
}
