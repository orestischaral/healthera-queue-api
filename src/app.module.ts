import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import configuration from '@infrastructure/config/configuration';
import { QueueModule } from '@infrastructure/queue/QueueModule';
import { QueueController } from '@infrastructure/http/controllers/QueueController';
import { MessageController } from '@infrastructure/http/controllers/MessageController';
import { HealthController } from '@infrastructure/http/controllers/HealthController';
import { PublishMessageHandler } from '@application/queue/commands/PublishMessageHandler';
import { CreateQueueHandler } from '@application/queue/commands/CreateQueueHandler';
import { DeleteQueueHandler } from '@application/queue/commands/DeleteQueueHandler';
import { AcknowledgeMessageHandler } from '@application/queue/commands/AcknowledgeMessageHandler';
import { ReceiveMessagesHandler } from '@application/queue/queries/ReceiveMessagesHandler';

const CommandHandlers = [
  PublishMessageHandler,
  CreateQueueHandler,
  DeleteQueueHandler,
  AcknowledgeMessageHandler,
];

const QueryHandlers = [ReceiveMessagesHandler];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CqrsModule,
    QueueModule.forRootAsync(),
  ],
  controllers: [QueueController, MessageController, HealthController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class AppModule {}
