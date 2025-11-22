import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { BullMqProvider } from './providers/BullMqProvider';
import { RabbitMqProvider } from './providers/RabbitMqProvider';
import { QueueProviderFactory } from './factories/QueueProviderFactory';

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
            return factory.create(providerType);
          },
          inject: [QueueProviderFactory, ConfigService],
        },
      ],
      exports: [IQueueProvider],
    };
  }
}
