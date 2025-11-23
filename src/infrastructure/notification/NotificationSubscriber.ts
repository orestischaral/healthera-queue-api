import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';
import { ProcessNotificationCommand } from '@application/notification/commands/ProcessNotificationCommand';

@Injectable()
export class NotificationSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSubscriber.name);
  private isSubscribed = false;

  constructor(
    private readonly queueProvider: IQueueProvider,
    private readonly commandBus: CommandBus,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queueProvider.createQueue('notifications');
      await this.queueProvider.subscribeToQueue(
        'notifications',
        this.handleNotification.bind(this),
      );
      this.isSubscribed = true;
      this.logger.log(
        'NotificationSubscriber subscribed to notifications queue',
      );
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to notifications queue: ${error.message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isSubscribed) {
      try {
        await this.queueProvider.unsubscribeFromQueue('notifications');
        this.logger.log(
          'NotificationSubscriber unsubscribed from notifications queue',
        );
      } catch (error) {
        this.logger.error(
          `Failed to unsubscribe from notifications queue: ${error.message}`,
        );
      }
    }
  }

  private async handleNotification(message: QueueMessage): Promise<void> {
    await this.commandBus.execute(new ProcessNotificationCommand(message));
  }
}
