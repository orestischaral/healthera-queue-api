import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import configuration from '@infrastructure/config/configuration';
import { QueueModule } from '@infrastructure/queue/QueueModule';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { NotificationModule } from './NotificationModule';
import { PublishMessageCommand } from '@application/queue/commands/PublishMessageCommand';
import { PublishMessageHandler } from '@application/queue/commands/PublishMessageHandler';
import { CreateQueueHandler } from '@application/queue/commands/CreateQueueHandler';
import { DeleteQueueHandler } from '@application/queue/commands/DeleteQueueHandler';
import { AcknowledgeMessageHandler } from '@application/queue/commands/AcknowledgeMessageHandler';
import { ReceiveMessagesHandler } from '@application/queue/queries/ReceiveMessagesHandler';

const PROVIDERS = ['bullmq', 'rabbitmq'];

describe.each(PROVIDERS)(
  'NotificationSubscriber E2E - %s Provider',
  (providerType: string) => {
    let app: INestApplication;
    let queueProvider: IQueueProvider;
    let commandBus: CommandBus;
    let logSpy: jest.SpyInstance;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
          }),
          CqrsModule,
          QueueModule.forRootAsync(),
          NotificationModule,
        ],
        providers: [
          PublishMessageHandler,
          CreateQueueHandler,
          DeleteQueueHandler,
          AcknowledgeMessageHandler,
          ReceiveMessagesHandler,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: (key: string) => {
            const config: Record<string, any> = {
              queueProvider: providerType,
              'redis.host': 'localhost',
              'redis.port': 6379,
              'rabbitmq.url': 'amqp://guest:guest@localhost:5672',
              'rabbitmq.retryAttempts': 3,
              'rabbitmq.retryDelayMs': 100,
            };
            return config[key];
          },
        })
        .compile();

      app = moduleFixture.createNestApplication();
      queueProvider = moduleFixture.get<IQueueProvider>(IQueueProvider);
      commandBus = moduleFixture.get<CommandBus>(CommandBus);

      await app.init();

      logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterAll(async () => {
      logSpy.mockRestore();
      await app.close();
    });

    beforeEach(() => {
      logSpy.mockClear();
    });

    it('should publish message and trigger notification', async () => {
      const queueName = 'test-queue-' + Math.random().toString(36).substring(7);
      const payload = { id: 123, status: 'pending' };

      await queueProvider.createQueue(queueName);

      const messageId = await commandBus.execute(
        new PublishMessageCommand(queueName, payload, {}),
      );

      expect(messageId).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const loggedNotifications = logSpy.mock.calls.filter((call) =>
        call[0]?.includes('Notification received'),
      );

      expect(loggedNotifications.length).toBeGreaterThan(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(queueName));
    }, 15000);

    it('should handle multiple publishes', async () => {
      const queueName =
        'multi-queue-' + Math.random().toString(36).substring(7);
      await queueProvider.createQueue(queueName);

      const messageIds = await Promise.all([
        commandBus.execute(new PublishMessageCommand(queueName, { id: 1 }, {})),
        commandBus.execute(new PublishMessageCommand(queueName, { id: 2 }, {})),
      ]);

      expect(messageIds).toHaveLength(2);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const notificationCount = logSpy.mock.calls.filter((call) =>
        call[0]?.includes('Notification received'),
      ).length;

      expect(notificationCount).toBeGreaterThanOrEqual(2);
    }, 15000);
  },
);
